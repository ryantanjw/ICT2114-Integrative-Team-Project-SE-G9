from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
from flask_cors import CORS

db = SQLAlchemy()

def create_app():
    
    app = Flask(__name__)
    app.jinja_env.cache = {}
    
    # Fix the typo and use a more secure secret key
    app.config['SECRET_KEY'] = "Hello"

    load_dotenv()  # Load environment variables from .env file

    # Use environment variable if available, otherwise use a default SQLite database
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI') or 'sqlite:///database.db'
    
    # Enable CORS for the whole app with support for credentials
    CORS(app, supports_credentials=True)

    db.init_app(app)
    
    from .views import views
    from .auth import auth
    
    app.register_blueprint(views, url_prefix='/')
    app.register_blueprint(auth, url_prefix='/')
    
    return app