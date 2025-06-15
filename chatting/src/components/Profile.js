import React from 'react';
import './css/Profile.css';
import { Link } from 'react-router-dom';

const Profile = () => {
  return (
    <div className="profile-page">
      <h2>User Profile</h2>
      <div className="profile-info">
        <img src="https://via.placeholder.com/100" alt="Profile" className="profile-pic" />
        <h3>Username: John Doe</h3>
        <p>Email: john@example.com</p>
        <button>Edit Profile</button>
      </div>
      <Link to="/chat">Chat</Link>
    </div>
  );
};

export default Profile;
