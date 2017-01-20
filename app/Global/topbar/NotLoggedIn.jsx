import React, { Component } from 'react';
import { Link } from 'react-router';

export default class NotLoggedIn extends Component {


	render(){
		return (
				<nav>
				  <div className="nav-wrapper light blue lighten-1">
				    <Link to="/" className="brand-logo left">Find-a-Roomate</Link>
				    <ul id="nav-mobile" className="right">
				      	<li><Link to="/learnmore">Learn More</Link></li>
				      	<li><Link to="/ourstory">Our Story</Link></li>
				      	<li><Link to="/login" className="waves-effect waves-light btn">Login/Signup</Link></li>
				    </ul>
				  </div>
				</nav>
			)
	}
}



