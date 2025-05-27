from flask import Blueprint,render_template,request

auth = Blueprint('auth',__name__,static_folder='static')

# This file is a blueprint that has lots of urls, routes!
# Each route has a function which is for this is each view's function

review_sentiment_per=0.0

@auth.route('/login')
def login():
    return render_template("login.html")
    

