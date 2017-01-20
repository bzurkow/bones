import React, { Component } from 'react';

export const Signup = ({ create, login }) => (
	<div className='Signup'>
	  <div className="row">
	    <form className="col s12" onSubmit={ 
	    	(evt) => {
		    	evt.preventDefault();
		    	let email = evt.target.email.value;
		    	let password = evt.target.password.value;
		    	let first_name = evt.target.first_name.value;
		    	let last_name = evt.target.last_name.value;
		    	let photoUrl = evt.target.photoUrl.value;
		    	console.log('hitting right before create')
		    	Promise.resolve()
		    	.then(() => create(email, password, first_name, last_name, photoUrl))
		    	.then(() => login(email, password))
		    	}
	    	}
	    >
	    <h5>Account Information (Please include all information)</h5>
	    <div className="row">
			<div className="first_name input-field col s12">
				<p>First Name</p>
				<input id="first_name" type="text" className="validate" placeholder="First Name"/>
			</div>
			<div className="last_name input-field col s12">
				<p>Last Name</p>
				<input id="last_name" type="text" className="validate" placeholder="Last Name"/>
			</div>
			<div className="email input-field col s12">
				<p>Email</p>
				<input id="email" type="text" className="validate" placeholder="Email"/>
			</div>
			<div className="password input-field col s12">
				<p>Password</p>
				<input id="password" type="text" className="validate" placeholder="Password"/>
			</div>
			<div className="photoUrl input-field col s12">
				<p>Profile Pic URL (please insert image address)</p>
				<input id="photoUrl" type="text" className="validate" placeholder="URL"/>
			</div>
	     </div>
	     <button className="btn waves-effect waves-light" type="submit" name="action">Create Account</button>
	    </form>
	  </div>
	</div>
)

import { connect } from 'react-redux'
import { login } from '../Login/reducer'
import { create } from './reducer'

export default connect(state => ({}), { create, login })(Signup)