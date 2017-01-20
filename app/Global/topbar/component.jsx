import React, { Component } from 'react';
import { Link } from 'react-router';
import LoggedIn from './LoggedIn'
import NotLoggedIn from './NotLoggedIn'


export const TopBar = (state) => (
	<div>
	 {!!state.auth ?  <LoggedIn  />  :  <NotLoggedIn /> }
	</div>	
)

import {connect} from 'react-redux'

export default connect (state => ({auth: state.auth}))(TopBar)