import React, { Component } from 'react';
import { Link } from 'react-router';
import { logout } from '../../Login/reducer';

export class LoggedIn extends Component {


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
				      	<li><Link to="/learnmore">Learn More</Link></li>
				      	<li><Link to="/ourstory">Our Story</Link></li>
				      	<li><Link to="/account" className="waves-effect waves-light btn">Account</Link></li>
				      	<li onClick={this.props.onLogout} >
				      		<button className="waves-effect waves-light btn" type='click' name='action'>
				      			Logout
				      		</button>
				      	</li>
				    </ul>
				  </div>
				</nav>
			)
	}
}

const mapDispatchToProps = (dispatch, ownProps) => {
	return { onLogout: () => dispatch(logout())}
}

import { connect } from 'react-redux';

export default connect(state => {state}, mapDispatchToProps)(LoggedIn)