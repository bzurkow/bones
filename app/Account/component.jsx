import React, { Component } from 'react';

export const Account = (state) => (
			<div>
				<div>
					<h3>Account Information</h3>
				    <div>{ !!state.auth ? 
				  		    	<img className="materialboxed" width="300" height="300" style={{"float": "right", "marginRight":"50px"}} src={state.auth.photoUrl}>
				  		    	
				  		    	</img>
				      		: 'error'
				      	}
				  	</div>
				<ul className="collection">
				  <li className="collection-item">
				    <label className="title">First Name</label>
				    <div>{ !!state.auth ? 
						    	<p>
						    	{state.auth.first_name}
						    	</p>
				    		: 'error'
				    	}
					</div>
				  </li>
				  <li className="collection-item">
				    <label className="title">Last Name</label>
			        <div>{ !!state.auth ? 
			    		    	<p>
			    		    	{state.auth.last_name}
			    		    	</p>
			        		: 'error'
			        	}
			    	</div>
				  </li>
				  <li className="collection-item">
				    <label className="title">Email</label>
			        <div>{ !!state.auth ? 
			    		    	<p>
			    		    	{state.auth.email}
			    		    	</p>
			        		: 'error'
			        	}
			    	</div>
				  </li>
				  <li className="collection-item">
				    <label className="title">Password</label>
				    <p>******</p>
				  </li>
				</ul>
				</div>
			</div>
		)

import {connect} from 'react-redux'

export default connect (
  state => ({auth: state.auth})
) (Account)