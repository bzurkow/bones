import React, { Component } from 'react';
import { Link } from 'react-router';

export const Home = (state) => (
			<div>
			{!!state.auth ? <h1>hitting home for logged in</h1> : (

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
			</div>
		)


import { connect } from 'react-redux';

export default connect(state => ({auth: state.auth}))(Home)