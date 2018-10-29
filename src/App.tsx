import * as React from "react";
import { BrowserRouter, Route } from "react-router-dom";

import { ChannelPage } from './pages/Channel/ChannelPage';
import { LandingPage } from './pages/Landing/LandingPage';

import "./nt.css";

class App extends React.Component {
    public render() {
        return (
            <BrowserRouter>
                <React.Fragment>
                    <Route path="/" exact={true} component={LandingPage} />
                    <Route path="/:channel" component={ChannelPage} />
                </React.Fragment>
            </BrowserRouter>
        );
    }
}

export default App;
