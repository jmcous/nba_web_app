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
        
        lineups = result_min['GROUP_NAME_x'].tolist()

        return jsonify({'x' : x, 'y' : y, 'lineups' : lineups})





if __name__ == '__main__':
    app.run(debug=True)