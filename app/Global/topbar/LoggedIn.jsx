import React, { Component } from 'react';
import { Link } from 'react-router';
import { logout } from '../../Login/reducer';

export class LoggedIn extends Component {


	render(){
		return (
				<nav>
				  <div className="nav-wrapper light blue lighten-1">
				    <Link to="/" className="brand-logo left">Find-a-Roomate</Link>
				    <ul id="nav-mobile" className="right">
				 	 	<li>
						 	<form className="hide-on-med-and-down">
						 	  <div className="input-field">
						 	    <input id="search" type="search" required />
						 	    <label htmlFor="search"><i className="material-icons">search</i></label>
						 	    <i className="material-icons">close</i>
						 	  </div>
						 	</form>
					 	</li>
				      	<li><Link to="/learnmore">Learn More</Link></li>
				      	<li><Link to="/ourstory">Our Story</Link></li>
				      	<li onClick={this.props.onLogout} type='click' name='action'>
				      			<Link>Logout</Link> 		
				      	</li>
				      	<li>
				      		<Link to="/account" style={{"width":"100%"}} className="waves-effect waves-light btn" style = {{"marginRight": "15px"}} >
				      			<img src={this.props.auth.photoUrl} style={{"width":"30px","height":"30px","verticalAlign":"middle","marginLeft":"-25px", "marginRight":"10px"}} className="avatar circle" />
				      			Account
				      		</Link>
				     
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

export default connect (state => ({auth: state.auth}), mapDispatchToProps)(LoggedIn)