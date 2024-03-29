from flask import Flask, jsonify, render_template, request,json, send_from_directory
import pandas as pd
import nba_api
from datetime import datetime
from nba_api.stats.static import teams
from nba_api.stats.endpoints import leaguegamefinder
from nba_api.stats.endpoints import leaguegamelog
from nba_api.stats.endpoints import boxscoretraditionalv2 as bxsctrad
from nba_api.stats.endpoints import boxscoresummaryv2 as bxscsum
from nba_api.stats.endpoints import boxscoreadvancedv2 as bxscadv
from nba_api.stats.endpoints import leaguedashteamstats
from nba_api.stats.endpoints import leaguedashlineups
from nba_api.stats.library.parameters import *
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
import numpy as np
from google.cloud import bigquery

def convert_int64(value):
    if isinstance(value, np.int64):
        return int(value)
    return value

app = Flask(__name__)

@app.route('/static/<path:filename>')
def custom_static(filename):
    return send_from_directory(app.static_folder, filename, mimetype='application/javascript' if filename.endswith('.js') else None)

@app.route('/', methods=['GET','POST'])
def index():
    return render_template('index.html')

@app.route('/nbaSubmit', methods=['GET','POST'])
def nbaSubmit():
    if request.method == "POST":
        
        # group_quantity = int(request.form['groupquantity'])
        group_quantity = float(request.form['groupquantity']);
        season = str(request.form['season'])
        min_mp = float(request.form['min_mp'])
        statx = str(request.form['statx'])
        staty = str(request.form['staty'])
        statz = str(request.form['statz'])
        try:
            kmclust = int(request.form['kmclust'])
        except KeyError:
            kmclust = 0
        try:
            linreg = int(request.form['linreg'])
        except KeyError:
            linreg = 0
        
        client = bigquery.Client()

        # if a z axis value is selected...
        if statz != '---':            

            query = f"""
                SELECT {statx}, {staty}, {statz}, GROUP_NAME, TEAM_ABBREVIATION
                FROM `nba5man.lineup_data.lineups`
                WHERE season = '{season}' AND lineup_size = {group_quantity} 
                AND MIN >= {min_mp}
            """
            query_job = client.query(query)
            result = query_job.to_dataframe()

            x = [convert_int64(v) for v in result[statx].tolist()]
            y = [convert_int64(v) for v in result[staty].tolist()]
            z = [convert_int64(v) for v in result[statz].tolist()]

        # if there is just x and y data selected
        else:
            query = f"""
                SELECT {statx}, {staty}, GROUP_NAME, TEAM_ABBREVIATION
                FROM `nba5man.lineup_data.lineups`
                WHERE season = '{season}' AND lineup_size = {group_quantity} 
                AND MIN >= {min_mp}
            """

            query_job = client.query(query)
            result = query_job.to_dataframe()

            x = [convert_int64(v) for v in result[statx].tolist()]
            y = [convert_int64(v) for v in result[staty].tolist()]
            z = ''

        lineups = result['GROUP_NAME'].tolist()
        teams   = result['TEAM_ABBREVIATION'].tolist()
        # get colors from kmeans clustering
        if (kmclust > 1):
            if statz != '---':            
                color = perform_kmeans_clustering(x, y, z, n_clusters=kmclust)
            else:
                color = perform_kmeans_clustering(x, y, n_clusters=kmclust)

        else:
            color = np.array('#43FF33')

        # if linreg, return the json with predicted data
        if (linreg==1) and (statz != '---'):
        
            xx_pred, yy_pred, predicted, results = perform_linear_regression(x, y, z)
            
            return jsonify({'x' : x, 'y' : y, 'z': z,
                             'x_pred': xx_pred.flatten().tolist(), 'y_pred': yy_pred.flatten().tolist(),'z_pred': predicted.tolist(),
                               'pred_results' : results, 'z' : z, 'lineups' : lineups, 'teams': teams, 'color' : color.tolist()})

        
        elif linreg:

            y_pred, results = perform_linear_regression(x, y)
            print(results)
            return jsonify({'x' : x, 'y' : y, 
                            'y_pred': y_pred.tolist(), 'pred_results' : results, 'z' : z,
                              'lineups' : lineups, 'teams': teams, 'color' : color.tolist()})


        
        return jsonify({'x' : x, 'y' : y, 'z' : z,
                         'lineups' : lineups, 'teams': teams, 'color' : color.tolist()})

@app.route('/getShotChart', methods=['POST'])
def getShotChart():
    if request.method == "POST":
        
        group_quantity = float(request.form['groupquantity'])
        season = str(request.form['season'])

        # season = '2022-23'
        # group_quantity = 5
        client = bigquery.Client()
        query = f"""
            SELECT group_id, group_name, shots
            FROM `nba5man.lineup_data.lineup_shots`
            WHERE season = '{season}' AND 
            lineup_size = {group_quantity}
        """
        query_job = client.query(query)
        result = query_job.to_dataframe()

        all_shots = []


        for index,row in result.iterrows():
            group_id = row['group_id']
            group_name = row['group_name']
            shots = row['shots']


            # Convert NumPy types to Python types for JSON serialization
            if isinstance(shots, np.ndarray):
                shots = shots.tolist()

            all_shots.append({
                'group_id' : group_id,
                'group_name' : group_name,
                'shots' : shots
            })


        return jsonify({'all_shots' : all_shots})
# Route for applying kmeans clustering without resubmtting the form and sql query
@app.route('/applyKmeans', methods=['POST'])
def applyKmeans():
    data = json.loads(request.form['data'])  # Assuming you're sending data as JSON string
    clusters = int(request.form['clusters'])
    
    x = data['x']
    y = data['y']
    z = data.get('z', None)  # Get the z value if available, else set to None


    # Perform kmeans clustering
    if z is not None and z != '':
        color = perform_kmeans_clustering(x, y, z, n_clusters=clusters)
    else:
        color = perform_kmeans_clustering(x, y, n_clusters=clusters)
    # Add the clustering result to the data and return
    data['color'] = color.tolist()

    return jsonify(data)

# Route for applying linear regression without resubmtting the form and sql query
@app.route('/applyLinReg', methods=['POST'])
def applyLinReg():
    data = json.loads(request.form['data'])
    x = data['x']
    y = data['y']
    z = data.get('z', None)  # Get the z value if available, else set to None

    # Perform linear regression
    if z is not None and z != '':
        xx_pred, yy_pred, predicted, results = perform_linear_regression(x, y, z)

        # Add the regression result to the data and return
        data['x_pred'] = xx_pred.flatten().tolist()
        data['y_pred'] = yy_pred.flatten().tolist()
        data['z_pred'] = predicted.tolist()
        data['pred_results'] = results


    else:

        y_pred, results = perform_linear_regression(x, y)

        # Add the regression result to the data and return
        data['y_pred'] = y_pred.tolist()
        data['pred_results'] = results

    return jsonify(data)


# main.py function for kmeans clustering
def perform_kmeans_clustering(x, y, z=None, n_clusters=2):
    if z is not None:
        data = np.column_stack((np.array(x), np.array(y), np.array(z)))
    else:
        data = np.column_stack((np.array(x), np.array(y)))

    kmeans = KMeans(n_clusters=n_clusters, random_state=42).fit(data)
    return kmeans.labels_

# main.py function for linear regression
def perform_linear_regression(x, y, z=None):
        if z is not None:
            # Convert to numpy arrays/dataframes/reshape
            x_ = np.array(x)
            y_ = np.array(y)
            z_ = np.array(z)
            
            df = pd.DataFrame({'x':x_,'y':y_,'z':z_})
            
            X = df[['x','y']].values.reshape(-1,2)
            Y = df['z']
            
            xm = X[:,0]
            ym = X[:,1]
            zm = Y
            
            x_pred = np.linspace(min(x_),max(x_),30)
            y_pred = np.linspace(min(y_),max(y_),30)
            xx_pred, yy_pred = np.meshgrid(x_pred,y_pred)
            model_viz = np.array([xx_pred.flatten(),yy_pred.flatten()]).T
            
            # fit to Linear Regression model
            ols = LinearRegression()
            model = ols.fit(X,Y)
            predicted = model.predict(model_viz)
            
            # evaluate
            r_sq = model.score(X,Y)
            intercept, coefficients = model.intercept_, model.coef_.tolist()
            results = [r_sq, intercept, coefficients]

            return xx_pred, yy_pred, predicted, results

        else:
            # Convert to numpy arrays/reshape
            x_ = np.array(x).reshape(-1,1)
            y_ = np.array(y)
            
            # fit to Linear Regression model
            model = LinearRegression().fit(x_,y_)

            # predicted y data
            y_pred = model.predict(x_)

            # get results
            r_sq = model.score(x_,y_)
            intercept, coefficients = model.intercept_, model.coef_.tolist()
            results = [r_sq, intercept, coefficients[0]]

            return y_pred, results



if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080,debug=True)