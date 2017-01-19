import React, { Component } from 'react';
import { Link } from 'react-router';

export default class Home extends Component {
	constructor(props){
		super(props)
	}


	render(){
		return(
			<div>

				<div className='home-Image'>
					<img src="images/AlbumCover.jpg" />
				</div>
				<div className='home-button'>
					<Link to="/signup" className="waves-effect waves-light btn">
					Find Your Perfect Roomate Now!
					</Link>
				</div>
			</div>

		)
	}
}