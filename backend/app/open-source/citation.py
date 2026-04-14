import requests
API_TOKEN = "b5978e071dfc96560ec42a1d44ec1a5716057970"
BASE_URL = "https://www.courtlistener.com/api/rest/v4"
headers = {
    "Authorization": f"Token {API_TOKEN}"
}

def lookup_citation(text: str):
    """
    Look up a citation string like:
    'Obergefell v. Hodges, 576 U.S. 644'
    or
    '576 U.S. 644'
    """
    url = f"{BASE_URL}/citation-lookup/"
    data = {"text": text}
    resp = requests.post(url, headers=headers, data=data, timeout=30)
    resp.raise_for_status()
    return resp.json()

citation_checker = lookup_citation("7-Eleven Owners for Fair Franchising v. Southland Corp. (2000) 85 Cal.App.4th 1135")
print(citation_checker)
