import * as Peer from "peerjs";
import * as React from "react";

import NineTracksLogo from "../../assets/logo.png";

import { FBF_CHANNEL_ENDPOINT, PEERJS_URI } from "../../config.json";

class LandingPage extends React.Component {
    public async queryChannel(channel: string) {
        const req = await fetch(FBF_CHANNEL_ENDPOINT);
    }

    public render() {
        return (
            <div className="login-page">
                <div className="login-modal">
                    <img className="login-logo logo" src={NineTracksLogo} />
                    <form className="login-form">
                        <input className="form-control mb-2" placeholder="Join a channel…" autoFocus={true} />
                        <button className="btn btn-primary btn-block">Join</button>
                    </form>
                </div>
            </div>
        );
    }
}

export { LandingPage };