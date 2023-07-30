from flask import Flask, jsonify, render_template, request,json
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
from sklearn import cluster
            
app = Flask(__name__)

@app.route('/', methods=['GET','POST'])
def index():
    return render_template('index.html')

@app.route('/nbaSubmit', methods=['GET','POST'])
def nbaSubmit():
    if request.method == "POST":
        
        # group_quantity = int(request.form['groupquantity'])
        group_quantity = 5;
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
        
        season = season.replace('-','_')
        filename = 'data/' + season+'_'+str(group_quantity)+'.csv'
        result = pd.read_csv(filename)
        
        # # get base and advance data from nba_api 

        # base_lineups = leaguedashlineups.LeagueDashLineups(group_quantity=group_quantity,season=season,measure_type_detailed_defense=MeasureTypeDetailedDefense().base)

        # advanced_lineups = leaguedashlineups.LeagueDashLineups(group_quantity=group_quantity,season=season,measure_type_detailed_defense=MeasureTypeDetailedDefense().advanced)
       
        # # convert returns to dataframes
        # dfb = base_lineups.get_data_frames()[0]
        # dfa = advanced_lineups.get_data_frames()[0]
        
        
        # # append dataframes
        # result = pd.merge(dfb,dfa,on="GROUP_ID")
         
        
        # filter based on minimum minutes
        result_min = result[result['MIN_x'] >= min_mp]
        
        # get x and y stats
        if statx in result_min.columns:
            x = result_min[statx].tolist()
        elif (statx+'_x') in result_min.columns:
            statx = statx + "_x"
            x = result_min[statx].tolist()
        else:
            a=1
            #print('problem with variable x')
        
        
        if staty in result_min.columns:
            y = result_min[staty].tolist()
        elif (staty+'_x') in result_min.columns:
            staty = staty + "_x"
            y = result_min[staty].tolist()
        else:
            a=1
            #print('problem with variable y')
            
            
        # if a statz variable is selected, use it    
        if statz != '---':            
            if statz in result_min.columns:
                z = result_min[staty].tolist()
            elif (statz+'_x') in result_min.columns:
                statz = statz + "_x"
                z = result_min[statz].tolist()
            else:
                a=1
                #print('problem with variable z')
        else:
            z = 'null'

        lineups = result_min['GROUP_NAME_x'].tolist()
        print(kmclust)
        # get colors from kmeans clustering
        if (kmclust > 1):
            if statz != '---':            
                kmeans = cluster.KMeans(n_clusters=kmclust,
                                        random_state=42).fit(np.column_stack((np.array(x),np.array(y),np.array(z))))
                color = kmeans.labels_
            else:
                kmeans = cluster.KMeans(n_clusters=kmclust,
                                        random_state=42).fit(np.column_stack((np.array(x),np.array(y))))
                color = kmeans.labels_
        else:
            color = np.array('#43FF33')

        # if linreg, return the json with predicted data
        if (linreg==1) and (statz != '---'):
        
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

            #print(r_sq)
            print(results)
            
            return jsonify({'x' : x, 'y' : y, 'z': z, 'x_pred': xx_pred.flatten().tolist(), 'y_pred': yy_pred.flatten().tolist(), 'z_pred': predicted.tolist(), 'pred_results' : results, 'z' : z, 'lineups' : lineups, 'color' : color.tolist()})

        
        elif linreg:
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
            print(results)
            return jsonify({'x' : x, 'y' : y, 'y_pred': y_pred.tolist(), 'pred_results' : results, 'z' : z, 'lineups' : lineups, 'color' : color.tolist()})


        
        return jsonify({'x' : x, 'y' : y, 'z' : z, 'lineups' : lineups, 'color' : color.tolist()})






if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080,debug=True)