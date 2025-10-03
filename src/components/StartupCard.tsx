import React from 'react';
import './StartupCard.css';
import { Startup } from '../types';

interface Props {
  startup: Startup;
  onYes?: () => void;
  onNo?: () => void;
  voted?: boolean;
  onUnvote?: () => void;
}

const StartupCard: React.FC<Props> = ({ startup, onYes, onNo, voted, onUnvote }) => {
  return (
    <div className="startup-card">
      <h3>{startup.name}</h3>
      <p className="startup-description">{startup.description}</p>
      <p><strong>Market:</strong> {startup.marketSize}</p>
      <p><strong>Unique:</strong> {startup.unique}</p>
      <p><strong>Raise:</strong> {startup.raise}</p>

      <div className="team-logos">
        {startup.teamLogos?.map((logo: string, idx: number) => (
          <img key={idx} src={logo} alt={`Team member ${idx}`} />
        ))}
      </div>

      <div className="vote-ticker">
        <span className="vote-count">Votes: {startup.yesVotes ?? 0}</span>
      </div>
      <div className="button-group">
        {voted ? (
          <>
            <button className="voted-button" disabled>Voted</button>
            <button className="change-vote-button" onClick={onUnvote ? onUnvote : undefined}>Change Vote</button>
          </>
        ) : (
          <>
            <button className="no-button" onClick={onNo}>No</button>
            <button className="yes-button" onClick={onYes}>Yes</button>
          </>
        )}
      </div>

      {startup.yesVotes !== undefined && startup.yesVotes >= 5 && (
        <button
          className="details-button"
          onClick={() => window.location.href = `/startup/${startup.id}`}
        >
          🔍 View Details
        </button>
      )}
    </div>
  );
};

export default StartupCard;
