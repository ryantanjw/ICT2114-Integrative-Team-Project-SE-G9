from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

db = SQLAlchemy()

def create_app():
    
    app = Flask(__name__)
    app.jinja_env.cache = {}
    app.config['SECRETE_KEY']="Hello"

    load_dotenv()  # Load environment variables from .env file

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')

    db.init_app(app)
    
    from .views import views
    from .auth import auth

    
    app.register_blueprint(views, url_prefix= '/')
    
    app.register_blueprint(auth, url_prefix= '/')
    
    
    return app