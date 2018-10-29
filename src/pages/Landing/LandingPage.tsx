import * as Peer from "peerjs";
import * as React from "react";

import { RouteComponentProps, withRouter } from "react-router-dom";

import NineTracksLogo from "../../assets/logo.png";

import { isAudioSupportsStreamCapturing } from 'src/testCaptureStream';
import { FBF_CREATE_CHANNEL_ENDPOINT, FBF_GET_CHANNEL_ENDPOINT, PEERJS_HOST, PEERJS_PORT } from "../../config";

export interface PeerChannel {
    name: string;
    peerId: string;
}

interface LandingPageState {
    channelName: string;
    loading: boolean;
}

// This is a hacky solution for accessing the Peer and channel instances in other files (namely, ChannelPage.tsx)
export let localPeer: Peer;
export let peerChannel: PeerChannel;

class LandingPage extends React.Component<RouteComponentProps, LandingPageState> {

    public constructor(props) {
        super(props);
        this.state = { channelName: "", loading: false };

        this.joinChannel = this.joinChannel.bind(this);
        this.onJoinChannel = this.onJoinChannel.bind(this);
        this.onChangeInput = this.onChangeInput.bind(this);
    }

    // queryChannel retrieves channel information (if present) from Cloud Firestore via Firebase cloud functions
    public async joinChannel(name: string) {
        this.setState({ loading: true });

        const { history } = this.props;
        localPeer = new Peer({ host: PEERJS_HOST, port: PEERJS_PORT });
        try {
            const req = await fetch(FBF_GET_CHANNEL_ENDPOINT + `?name=${name}`, { credentials: "include", mode: "cors" });
            if (req.ok) {
                peerChannel = await req.json() as PeerChannel;
                // Join the queried channel via the peerId
                history.push(`/${name}`);
            } else {
                // Assume the channel does not exist, and create a new one
                const channel = await fetch(FBF_CREATE_CHANNEL_ENDPOINT, {
                    body: JSON.stringify({ name, peerId: localPeer.id }),
                    credentials: "include",
                    method: "POST",
                    mode: "cors",
                });
                if (channel.ok) {
                    peerChannel = await channel.json();
                    history.push(`/${name}`);
                } else {
                    console.error(channel);
                }
            }
        } catch (err) {
            console.error(err);
            alert(err);
            this.setState({ loading: false });
        }
    }

    public onJoinChannel(e) {
        e.preventDefault();
        this.joinChannel(this.state.channelName);
    }

    // onChangeInput formats the incoming channel name input, replacing spaces with dashes and converting to lowercase
    public onChangeInput(e) {
        let value = e.target.value as string;
        value = value.replace(/\s+/g, '-').replace(/-{2,}/g, "-").toLowerCase();
        if (value === "-") { value = ""; }
        if (value.length > 36) { value = value.slice(0, 36); }
        this.setState({ channelName: value });
    }

    public render() {
        return (
            <div className="center-page">
                <div className="login-modal">
                    <img className="login-logo logo" src={NineTracksLogo} />
                    <form className="login-form" onSubmit={this.onJoinChannel}>
                        <input className="form-control mb-2" placeholder="Enter a channel…" autoFocus={true} value={this.state.channelName} onChange={this.onChangeInput} />
                        <button type="submit" className="btn btn-primary btn-block" disabled={this.state.loading || this.state.channelName.trim() === ""}>
                            { this.state.loading ?
                                <i className="fa fa-circle-o-notch fa-spin"/>
                            :
                                "Join"
                            }
                        </button>
                    </form>
                </div>
                { !isAudioSupportsStreamCapturing &&
                    <p className="page-alert">Hey! It seems like your current browser doesn't support <a href="https://www.html5rocks.com/en/tutorials/webrtc/basics/">Media Capturing,</a> so you may have some issues using NineTracks. Try switching to a different browser if you can.</p>
                }
            </div>
        );
    }
}

// @ts-ignore   Typescript can be a pain in the ass sometimes
const RouterLandingPage = withRouter(LandingPage);

export { RouterLandingPage as LandingPage };