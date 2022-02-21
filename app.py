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

            
app = Flask(__name__)

@app.route('/', methods=['GET','POST'])
def index():
    return render_template('index.html')

@app.route('/nbaSubmit', methods=['GET','POST'])
def nbaSubmit():
    if request.method == "POST":
        
        group_quantity = int(request.form['groupquantity'])
        season = str(request.form['season'])
        min_mp = float(request.form['min_mp'])
        statx = str(request.form['statx'])
        staty = str(request.form['staty'])
        statz = str(request.form['statz'])
        try:
            linreg = int(request.form['linreg'])
        except KeyError:
            linreg = 0
        
        
        # get base and advance data from nba_api 

        base_lineups = leaguedashlineups.LeagueDashLineups(group_quantity=group_quantity,season=season,measure_type_detailed_defense=MeasureTypeDetailedDefense().base)

        advanced_lineups = leaguedashlineups.LeagueDashLineups(group_quantity=group_quantity,season=season,measure_type_detailed_defense=MeasureTypeDetailedDefense().advanced)
       
        # convert returns to dataframes
        dfb = base_lineups.get_data_frames()[0]
        dfa = advanced_lineups.get_data_frames()[0]
        
        
        # append dataframes
        result = pd.merge(dfb,dfa,on="GROUP_ID")
        
        # filter based on minimum minutes
        result_min = result[result['MIN_x'] >= min_mp]
        
        # get x and y stats
        if statx in result_min.columns:
            x = result_min[statx].tolist()
        elif (statx+'_x') in result_min.columns:
            statx = statx + "_x"
            x = result_min[statx].tolist()
        else:
            print('problem with variable x')
        
        
        if staty in result_min.columns:
            y = result_min[staty].tolist()
        elif (staty+'_x') in result_min.columns:
            staty = staty + "_x"
            y = result_min[staty].tolist()
        else:
            print('problem with variable y')
            
            
        # if a statz variable is selected, use it    
        if statz != '---':            
            if statz in result_min.columns:
                z = result_min[staty].tolist()
            elif (statz+'_x') in result_min.columns:
                statz = statz + "_x"
                z = result_min[statz].tolist()
            else:
                print('problem with variable z')
        else:
            z = 'null'

        lineups = result_min['GROUP_NAME_x'].tolist()

        # if linreg, return the json with predicted data
        if linreg:
            # Convert to numpy arrays/reshape
            x_ = np.array(x).reshape(-1,1)
            y_ = np.array(y)
            
            # fit to Linear Regression model
            model = LinearRegression().fit(x_,y_)

            # predicted y data
            y_pred = model.predict(x_)
            
            return jsonify({'x' : x, 'y' : y, 'y_pred': y_pred.tolist(), 'z' : z, 'lineups' : lineups})

        
        return jsonify({'x' : x, 'y' : y, 'z' : z, 'lineups' : lineups})






if __name__ == '__main__':
    app.run(debug=True)