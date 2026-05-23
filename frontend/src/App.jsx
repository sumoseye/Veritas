import { useState } from 'react';
import PoliceDashboard from './components/PoliceDashboard';
import CitizenPortal from './components/CitizenPortal';
import AppealQueue from './components/AppealQueue';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('citizen');

    return (
        <div className="app">
            <nav className="navigation">
                <div className="nav-brand">
                    Traffic Fining System
                </div>
                <div className="nav-tabs">
                    <button 
                        onClick={() => setActiveTab('police')}
                        className={`nav-tab ${activeTab === 'police' ? 'active' : ''}`}
                    >
                        Issue Citation
                    </button>
                    <button 
                        onClick={() => setActiveTab('appeals')}
                        className={`nav-tab ${activeTab === 'appeals' ? 'active' : ''}`}
                    >
                        Review Appeals
                    </button>
                    <button 
                        onClick={() => setActiveTab('citizen')}
                        className={`nav-tab ${activeTab === 'citizen' ? 'active' : ''}`}
                    >
                        Citizen Portal
                    </button>
                </div>
            </nav>

            <main className="main-content">
                {activeTab === 'police' && <PoliceDashboard />}
                {activeTab === 'appeals' && <AppealQueue />}
                {activeTab === 'citizen' && <CitizenPortal />}
            </main>

            <footer className="footer">
                <p>Traffic Fining System - Email Notifications via Mailtrap</p>
            </footer>
        </div>
    );
}

export default App;