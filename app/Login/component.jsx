import React, { Component } from 'react';
import { Link } from 'react-router'

export const Login = ({login}) => (
	<div className='Login'>
	  <div className="row">
	    <form className="col s12" onSubmit={evt=>{
	    	evt.preventDefault()
	    	let email = evt.target.email.value
	    	let password = evt.target.password.value
	    	login(email, password)
	    	}
		}
	    >
	      <div className="row">
	        <div className="email input-field col s6">
	          <p>Email</p>
	          <input name="email" type="text" className="validate" placeholder="Email"/>
	          <label htmlFor="icon_prefix"></label>
	        </div>
	        <div className="password input-field col s6">
	          <p>Password</p>
	          <input name="password" className="validate" placeholder="Password"/>
	          <label htmlFor="icon_telephone"></label>
	        </div>
	      </div>
	      <button className="btn waves-effect waves-light" type="submit" name="action">Log In</button>
	    </form>
	  </div>
	    <div>
	      <Link to="/signup" className="waves-effect waves-light btn" style={{"marginLeft": "11px" }}>Signup</Link>
	  	</div>
	</div>
)

import {login} from './reducer'
import {connect} from 'react-redux'

export default connect (
  state => ({}),
  { login }
) (Login)