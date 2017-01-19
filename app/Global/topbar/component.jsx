import React, { Component } from 'react';
import { Link } from 'react-router';

export default class TopBar extends Component {


	render(){
		return (
				<nav>
				  <div className="nav-wrapper light blue lighten-1">
				    <Link to="/" className="brand-logo">Find-a-Roomate</Link>
				    <ul id="nav-mobile" className="right hide-on-med-and-down">
				 	 	<li>
						 	<form>
						 	  <div className="input-field">
						 	    <input id="search" type="search" required />
						 	    <label htmlFor="search"><i className="material-icons">search</i></label>
						 	    <i className="material-icons">close</i>
						 	  </div>
						 	</form>
					 	</li>
				      	<li><a href="sass.html">Learn More</a></li>
				      	<li><a href="badges.html">Our Story</a></li>
				      	<li><Link to="/login" className="waves-effect waves-light btn">Login/Signup</Link></li>
				    </ul>
				  </div>
				</nav>
			)
	}
}