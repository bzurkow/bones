import React, { Component } from 'react';

export default class Account extends Component {
	render(){
		return(
			<div className='Signup'>
			  <div className="row">
			    <form className="col s12">
			    <h5>Account Information</h5>
			    <div className="row">
					<div className="first-name input-field col s12">
						<p>First Name</p>
						<input id="icon_prefix" type="text" className="validate" placeholder="First Name"/>
					</div>
					<div className="last-name input-field col s12">
						<p>Last Name</p>
						<input id="icon_prefix" type="text" className="validate" placeholder="Last Name"/>
					</div>
					<div className="email input-field col s12">
						<p>Email</p>
						<input id="icon_prefix" type="text" className="validate" placeholder="Email"/>
					</div>
					<div className="password input-field col s12">
						<p>Password</p>
						<input id="icon_prefix" type="text" className="validate" placeholder="Password"/>
					</div>
			     </div>
			     <button className="btn waves-effect waves-light" type="submit" name="action">Create Account</button>
			    </form>
			  </div>
			</div>
			)
	}
}
