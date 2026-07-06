import urllib.request
import json
import re

url = "https://worldcup26.ir/get/games"
try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
        data = json.loads(content)

    print("Round of 16 matches:")
    r16_games = [g for g in data['games'] if re.match(r'^r16$', g.get('type', ''), re.I)]
    for g in r16_games:
        print(f"Match {g.get('id')}: {g.get('home_team_name_en')} vs {g.get('away_team_name_en')} | Score: {g.get('home_score')}-{g.get('away_score')} | Finished: {g.get('finished')} | Elapsed: {g.get('time_elapsed')} | home_team_id: {g.get('home_team_id')} | away_team_id: {g.get('away_team_id')}")

    print("\nQuarter-Final matches:")
    qf_games = [g for g in data['games'] if re.match(r'^qf$', g.get('type', ''), re.I)]
    for g in qf_games:
        print(f"Match {g.get('id')}: {g.get('home_team_name_en')} vs {g.get('away_team_name_en')} | Score: {g.get('home_score')}-{g.get('away_score')} | Finished: {g.get('finished')} | Elapsed: {g.get('time_elapsed')} | home_team_id: {g.get('home_team_id')} | away_team_id: {g.get('away_team_id')}")

except Exception as e:
    print(f"Error: {e}")
