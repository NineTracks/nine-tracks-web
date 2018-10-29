import * as Peer from "peerjs";
import * as React from "react";

import classnames from "classnames";

import { RouteComponentProps, withRouter } from "react-router";
import { FBF_GET_CHANNEL_ENDPOINT, PEERJS_HOST, PEERJS_PORT } from "src/config";

import { localPeer, peerChannel, PeerChannel } from "../Landing/LandingPage";

// TODO: Add blocking alert whenever user attempts to exit webpage
// warning them that the channel will self-destruct if they continue

enum PeerEventType {
    NewConnection = "NEW_CONNECTION",
    TrackInformation = "TRACK_INFORMATION",
}

interface CapturableHtmlMediaElement extends HTMLMediaElement {
    captureStream: () => MediaStream,
    mozCaptureStream: () => MediaStream,    // Firefox uses their own captureStream implementation
}

interface PeerConnection {
    connection?: Peer.DataConnection;
    id: string;
    me: boolean;
}

interface TrackInformation {
    name: string;
    playing: boolean;
}

interface PeerEvent {
    type: PeerEventType,
    data: any,
}

interface ChannelPageState {
    channel?: PeerChannel;
    peer?: Peer;
    track?: TrackInformation;
    stream?: MediaStream;
    isOwner: boolean;
    connections: PeerConnection[];
    pageLoading: boolean;
}

class ChannelPage extends React.Component<RouteComponentProps, ChannelPageState> {
    public uploadRef: React.RefObject<HTMLInputElement>;
    public audioRef: React.RefObject<CapturableHtmlMediaElement>;

    public constructor(props) {
        super(props);
        this.state = {
            connections: [],
            isOwner: false,
            pageLoading: true,
        };
        this.uploadRef = React.createRef<HTMLInputElement>();
        this.audioRef = React.createRef<CapturableHtmlMediaElement>();

        this.triggerUpload = this.triggerUpload.bind(this);
        this.onUploadTrack = this.onUploadTrack.bind(this);
        this.setPlaying = this.setPlaying.bind(this);
        this.onTogglePlaying = this.onTogglePlaying.bind(this);
    }

    // componentWillMount rechecks the existence of the queried channel (TODO),
    // and revalidate the Peer instance, creating a new one if undefined
    public async componentDidMount() {
        const { match } = this.props;
        if (peerChannel) {
            await this.setState({ channel: peerChannel });
        } else {
            const req = await fetch(
                FBF_GET_CHANNEL_ENDPOINT + `?name=${match.params["channel"]}`,
                { mode: "cors", credentials: "include" }
            );
            if (req.ok) {
                this.setState({ channel: await req.json() });
            } else {
                location.replace("/");
                return;
            }
        }
        if (localPeer) {
            await this.setState({ peer: localPeer });
            this.setPeerHandlers(localPeer);
        } else {
            const peer = new Peer({ host: PEERJS_HOST, port: PEERJS_PORT });
            await this.setState({ peer });
            this.setPeerHandlers(this.state.peer!);
        }

        this.setState({ pageLoading: false });
        
        // Attach event handlers to audio element
        this.setAudioHandlers(this.audioRef.current!);
    }

    public triggerUpload() {
        if (this.uploadRef.current) {
            this.uploadRef.current.click();
        }
    }

    // onUploadTrack is triggered whenever the user uploads an audio file
    public async onUploadTrack(e) {
        const files = e.target.files;
        if (files[0]) {
            const file = files[0] as File;
            e.target.value = "";    // Clear the current value so that the same file may be re-uploaded again
            await this.playAndStreamTrack(file);
        }
    }

    // playAndStreamTrack streams an audio file to the current user and all of their connected peers
    public async playAndStreamTrack(file: File) {
        const domUrl = URL.createObjectURL(file);
        if (this.audioRef.current) {
            // Revoke the old object URL to prevent memory leakage
            if (this.audioRef.current.src) { URL.revokeObjectURL(this.audioRef.current.src); }
            // Set the new object URL into the audio player
            this.audioRef.current.src = domUrl;     // At this point, any old MediaStreams will have been destroyed
            await this.setState({ track: Object.assign({}, this.state.track, { name: file.name })});
            // Check if browser supports media capture
            if (!this.audioRef.current.captureStream) {
                alert("Your browser does not support Media Capturing. Please use a different browser.");
                this.state.peer!.destroy();
                location.href = "/";
            }
        }
    }

    public async setPlaying(playing: boolean, force?: boolean) {
        console.log(this.audioRef.current, this.audioRef.current!.readyState);
        if (this.audioRef.current && (this.audioRef.current.readyState > 0 || force)) {
            try {
                if (playing) {
                    await this.audioRef.current.play();
                } else {
                    await this.audioRef.current.pause();
                }
            } catch (err) {
                alert(err);
            }
        }
    }

    public async onTogglePlaying() {
        console.log(this.state);
        await this.setPlaying(this.audioRef.current!.paused);
    }

    public render() {
        return (
            <div className="center-page">
                {this.state.pageLoading ? (
                    <i className="fa fa-circle-o-notch fa-spin fa-4x page-loading" />
                ) : (
                    <div className="channel-modal">
                        <h1 className="mb-3">{this.state.channel!.name}</h1>
                        <div className="card mb-3 channel-playlist">
                            <div className="card-body">
                                <audio controls={false} ref={this.audioRef}>
                                    <source src=""/>
                                </audio>
                                <p className="card-text mb-2 mt-2">{ this.state.track && this.state.track.name ? this.state.track.name : "Nothing is playing" }</p>
                                { this.state.isOwner &&
                                    <React.Fragment>
                                        <div className="btn-group">
                                            <button type="button" className="btn btn-link"><i className="fa fa-fast-backward"/></button>
                                            <button type="button" className="btn btn-link" onClick={this.onTogglePlaying}><i className={classnames(
                                                "fa",
                                                { "fa-play": (this.state.track && !this.state.track.playing) || !this.state.track },
                                                { "fa-pause": this.state.track && this.state.track.playing}
                                            )}/></button>
                                            <button type="button" className="btn btn-link"><i className="fa fa-fast-forward"/></button>
                                        </div>
                                        <button type="file" className="btn btn-link btn" onClick={this.triggerUpload}>Upload…</button>
                                        <input className="channel-browse" type="file" ref={this.uploadRef} onChange={this.onUploadTrack} accept="audio/*"/>
                                    </React.Fragment>
                                }
                            </div>
                        </div>
                        <ul className="channel-connections">
                            {this.state.connections.sort((a, b) => {
                                // Sort connections by connection ID
                                if (a.id < b.id) { return -1; }
                                if (a.id > b.id) { return 1; }
                                return 0;
                            }).map((c, i) => (
                                <i
                                    className={classnames(
                                        "fa fa-user fa-2x",
                                        { "connection-host": this.state.channel!.peerId === c.id },
                                        { "connection-local": c.me },
                                        { "mr-3": i !== this.state.connections.length-1 },
                                    )}
                                    key={c.id}
                                />
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    // addConnection adds a new peer connection to the current list of peer connections
    private addConnection(connection: PeerConnection) {
        this.setState({ connections: [...this.state.connections, connection] });
    }

    private setRemotePeerHandlers(remotePeer: Peer.DataConnection) {
        remotePeer.on("open", () => {
            // Broadcast the new connection if local peer is channel host
            if (this.state.isOwner) {
                if (this.state.track) {
                    // Send the current track information to the newly-joined peer, and attempt to call them
                    remotePeer.send({
                        data: {
                            name: this.state.track.name,
                            playing: this.state.track.playing,
                        } as TrackInformation,
                        type: PeerEventType.TrackInformation,
                    } as PeerEvent);
                }
                if (this.state.stream) {
                    this.state.peer!.call(remotePeer.peer, this.state.stream);
                }
                // Filter the current list of peers by those who aren't the server owner, and aren't the newly-joined peer
                this.state.connections.filter((c) => !c.me && c.id !== remotePeer.peer).forEach((c) => {
                    // Broadcast a message identifying the new peer to all other peers
                    c.connection!.send({
                        data: remotePeer.peer,
                        type: PeerEventType.NewConnection,
                    } as PeerEvent);
                });
            }

            remotePeer.on("data", (d: any) => {
                if (typeof d === "object") {
                    // Assume received data is a PeerEvent, and handle it accordingly
                    switch ((d as PeerEvent).type) {
                        case PeerEventType.NewConnection: {
                            // Connect to the newly-joined peer
                            const newPeer = this.state.peer!.connect((d as PeerEvent).data);
                            this.setRemotePeerHandlers(newPeer);
                            this.addConnection({
                                connection: newPeer,
                                id: newPeer.peer,
                                me: false,
                            });
                        }
                        case PeerEventType.TrackInformation: {
                            // Set the player status according to the data in the track information
                            this.setState({ track: (d as PeerEvent).data });
                        }
                    }
                }
            });

            remotePeer.on("error", (err) => {
                console.error(err);
            })

            remotePeer.on("close", () => {
                this.setState({
                    connections: this.state.connections.filter((c) => {
                        if (c.me) {
                            return true;
                        }
                        if (c.id !== remotePeer.peer) {
                            return true;
                        }
                        return false;
                    }),
                });
            });
        });
    }

    // setPeerHandlers initializes event response handlers for the local peer
    private setPeerHandlers(peer: Peer) {
        // Sometimes, the broker ID for the peer may already be generated, so
        // check in advance, and if so, add the peer to the connection list early
        let addedConnection = false;
        if (peer.id) {
            this.addConnection({
                connection: undefined,
                id: peer.id,
                me: true,
            });
            addedConnection = true;
        }
        peer.on("open", () => {
            if (!addedConnection) {
                // In this case, the broker ID has now finally been generated,
                // so go ahead and add the peer to the connection list
                this.addConnection({
                    connection: undefined,
                    id: peer.id,
                    me: true,
                });
            }
        });
        // Connect to the channel host
        if (this.state.channel!.peerId !== this.state.peer!.id) {
            const remotePeer = this.state.peer!.connect(
                this.state.channel!.peerId
            );
            this.setRemotePeerHandlers(remotePeer);
            this.addConnection({
                connection: remotePeer,
                id: remotePeer.peer,
                me: false,
            });
        } else {
            this.setState({ isOwner: true });
        }
        peer.on("connection", (remotePeer) => {
            this.addConnection({
                connection: remotePeer,
                id: remotePeer.peer,
                me: false,
            });
            this.setRemotePeerHandlers(remotePeer);
        });
        peer.on("call", (connection) => {
            console.log("got call");
            connection.answer();
            connection.on("stream", async (stream: MediaStream) => {
                console.log(stream);
                this.audioRef.current!.srcObject = stream;
                await this.setPlaying(true, true);
            });
            connection.on("error", (err) => console.error);

        });
        peer.on("error", (err) => {
            alert(err);
            location.href = "/";
        });
    }

    private async setAudioHandlers(audio: CapturableHtmlMediaElement) {
        // Combine Firefox captureStream implementation with normal one
        if (audio.mozCaptureStream && !audio.captureStream) {
            audio.captureStream = audio.mozCaptureStream;
        }
        audio.addEventListener("ended", async () => {
            await this.setPlaying(false);
        });
        audio.addEventListener("pause", () => {
            this.setState({ track: Object.assign({}, this.state.track, { playing: false })});
        });
        audio.addEventListener("play", () => {
            this.setState({ track: Object.assign({}, this.state.track, { playing: true })});
        });
        audio.addEventListener("canplay", async () => {
            if (this.state.isOwner) {
                await this.setPlaying(true);
                const stream = audio.captureStream();
                this.setState({ stream, track: Object.assign({}, this.state.track)});
                console.log(this.state);
                // Pipeway stream to all clients
                this.state.connections.filter((c) => !c.me).forEach((c) => {
                    c.connection!.send({
                        data: {
                            name: this.state.track!.name,
                            playing: this.state.track!.playing,
                        } as TrackInformation,
                        type: PeerEventType.TrackInformation,
                    } as PeerEvent);
                    this.state.peer!.call(c.id, stream);
                });
            }
        });
    }
}

// @ts-ignore   Typescript can be a pain in the ass sometimes
const RouterChannelPage = withRouter(ChannelPage);

export { RouterChannelPage as ChannelPage };
