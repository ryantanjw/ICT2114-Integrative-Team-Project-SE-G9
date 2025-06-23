from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
from flask_cors import CORS
from datetime import timedelta

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.jinja_env.cache = {}
    
    # Use a strong secret key
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', os.urandom(24).hex())
    
    # Configure session
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)
    
    # Cross-domain session settings - CRITICAL for your issue
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = None  # IMPORTANT: Must be None (not 'None') for cross-domain
    
    load_dotenv()
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI') or 'sqlite:///database.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Configure CORS properly for cross-domain cookies
    CORS(app, 
        supports_credentials=True,
        resources={r"/*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }})
    
    db.init_app(app)
    
    from .views import views
    from .auth import auth
    
    app.register_blueprint(views, url_prefix='/')
    app.register_blueprint(auth, url_prefix='/')
    
    return app