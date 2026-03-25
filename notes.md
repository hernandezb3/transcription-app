User Interface
Routing
Data Fetching
Routing
Performance and Scalability
Integrations and Infrastructure


Javascript Library

## how to create a basic template
    npm create next-app


# overall format

each folder is a route


front end structure
    /users - front end page - displaying users
        page.tsx
            - display / forward along information
            x retrive data from an external api service (fast api)
        current url
            localhost:3000/users

        url its calling
            localhost:3000/api/users
    
    /api
        /users
            route.ts

        - retrive data from an external api service (fast api)
        
        url: 
            localhost:3000/api/users
        
        url its calling:
            localhost:8000/api/users

backend
    api_router/
        users/
            route.py

        current url
            localhost:8000/api/users
    
    
database
    ??