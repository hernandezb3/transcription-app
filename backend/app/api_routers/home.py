from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from config.app_settings import SettingsConfig

router = APIRouter()
settings = SettingsConfig().settings.BuildInformation

@router.get("/", response_class=HTMLResponse)
def read_root(request: Request):
    docs_url = request.url_for("swagger_ui_html")
    img_src = "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZXEwaHRweHQ5ZmxuYmxndzJmMDl4YXFtdGIwaW8zdDFibG1kZDZndiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TZ2oBnEvY9iMgJWuRS/giphy.webp"
    
    build_number = settings.build_number
    build_id = settings.build_id
    build_url = settings.build_url
    build_user = settings.build_user
    
    build_timestamp = settings.init_time
    build_time = build_timestamp.strftime('%Y-%m-%d %H:%M:%S')

    html_response = f""" 
        <html>
            <head>
                <style>
                    body {{
                        background-color: #8CEAFF;
                        color: black;
                        text-align: center;
                        font-family: Arial, sans-serif;
                    }}
                    .container {{
                        margin-top: 20px;
                        text-align: left;
                        display: inline-block;
                        background-color: #ffffff;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        width: 80%;
                        max-width: 600px;
                    }}
                    .container h2 {{
                        border-bottom: 2px solid #8CEAFF;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                        text-align: center;
                    }}
                    .container p {{
                        margin: 10px 0;
                        display: flex;
                        align-items: center;
                    }}
                    .container p strong {{
                        width: 150px;
                        display: inline-block;
                    }}
                    .container a {{
                        color: blue;
                        text-decoration: none;
                    }}
                    .container a:hover {{
                        text-decoration: underline;
                    }}
                    .image-container {{
                        text-align: center;
                        margin: 20px 0;
                    }}
                    .image-container img {{
                        border-radius: 10px;
                    }}
                    .icon {{
                        margin-right: 10px;
                        color: #8CEAFF;
                    }}
                </style>
            </head>
            <body>
                <h1>Transcription Services API</h1>
                <div class="image-container">
                    <img src="{img_src}" alt="avocado" width="500" height="500">
                </div>
                <div class="container">
                    <h2>API Details</h2>
                    <p><strong>API Definition:</strong> <a href="{docs_url}">Click here for swagger defintion</a></p>
                    <p><strong>Build Number:</strong> {build_number}</p>
                    <p><strong>Build Id:</strong> {build_id}</p>
                    <p><strong>Build URL:</strong> <a href="{build_url}">Click here for build details</a></p>
                    <p><strong>Build User:</strong> <a href="mailto:{build_user}">{build_user}</a></p>
                    <p><strong>Build Time:</strong> {build_time}</p>
                </div>
            </body>
        </html>
        """

    return html_response