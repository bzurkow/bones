import React, { Component } from 'react';

export class Account extends Component {
	constructor(props){
		super(props)
	}

	render(){
		return(
			<div>
				<div>
					{console.log('auth', this.props.auth)}
					<h3>Account Information</h3>
				<ul className="collection">
				  <li className="collection-item">
				    <label className="title">First Name</label>
				    <p>First Name</p>
				  </li>
				  <li className="collection-item">
				    <label className="title">Last Name</label>
				    <p>Last Name</p>
				  </li>
				  <li className="collection-item">
				    <label className="title">Email</label>
				    <p>Email</p>
				  </li>
				  <li className="collection-item">
				    <label className="title">Password</label>
				    <p>******</p>
				  </li>
				</ul>
				</div>
			</div>
		)
	}
}

import {connect} from 'react-redux'

export default connect (
  state => ({auth: state.auth})
) (Account)