import React, { Component } from 'react';

export default class Account extends Component {
	render(){
		return(
			<div className='Login'>
			  <div className="row">
			    <form className="col s12">
			      <div className="row">
			        <div className="email input-field col s6">
			          <i className="material-icons prefix">email</i>
			          <input id="icon_prefix" type="text" className="validate" placeholder="email"/>
			          <label htmlFor="icon_prefix"></label>
			        </div>
			        <div className="password input-field col s6">
			          <i className="material-icons prefix">security</i>
			          <input id="icon_telephone" type="tel" className="validate" placeholder="Password"/>
			          <label htmlFor="icon_telephone"></label>
			        </div>
			      </div>
			      <button className="btn waves-effect waves-light" type="submit" name="action" onSubmit={this.handleSubmit}>Log In
			      	<i className="material-icons right"></i>
			      </button>
			    </form>
			  </div>
			</div>
			)
	}
}