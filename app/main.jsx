'use strict'
import React from 'react'
import {Router, Route, IndexRedirect, browserHistory} from 'react-router'
import {render} from 'react-dom'
import {connect, Provider} from 'react-redux'

import store from './store'
import Jokes from './components/Jokes'
import LoginTheirs from './components/Login'
import WhoAmI from './components/WhoAmI'
import Global from './Global/component';
import Home from './Home/component';
import App from './app.jsx';
import Signup from './Signup/component';
import Login from './Login/component';
import Account from './Account/component';
import LearnMore from './Static/learnmore';
import OurStory from './Static/ourstory';

const ExampleApp = connect(
  ({ auth }) => ({ user: auth })
) (
  ({ user, children }) =>
    <div>
      <nav>
        {user ? <WhoAmI/> : <Login/>}
      </nav> 
      {children}
    </div>
)

render (
  <Provider store={store}>
    <Router history={browserHistory}>
      <Route path="/" component={App} >
        <Route path="home" component={Home} />
        <Route path="login" component={Login} />
        <Route path="signup" component={Signup} />
        <Route path="account" component={Account} />
        <Route path="ourstory" component={OurStory} />
        <Route path="learnmore" component={LearnMore} />
        <IndexRedirect to="/home" />
      </Route>
    </Router>
  </Provider>,
  document.getElementById('main')
)