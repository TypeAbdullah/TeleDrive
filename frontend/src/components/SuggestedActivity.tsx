import React from 'react';
import { YellowFolderGraphic } from './YellowFolderGraphic';

interface SuggestedActivityProps {
  activeFilter?: string | null;
  onSelectType: (type: string | null) => void;
}

export const SuggestedActivity: React.FC<SuggestedActivityProps> = ({
  activeFilter,
  onSelectType,
}) => {
  const cards = [
    { type: 'DOCX', label: 'DOCX' },
    { type: 'JPG', label: 'JPG' },
    { type: 'PDF', label: 'PDF' },
    { type: 'PNG', label: 'PNG' },
  ];

  return (
    <section className="suggested-activity-section">
      <div className="section-title-row">
        <h2 className="section-heading-sm">Suggested from your activity</h2>
      </div>

      <div className="suggested-cards-grid">
        {cards.map((card) => {
          const isSelected = activeFilter?.toUpperCase() === card.type;

          return (
            <div
              key={card.type}
              id={`suggested-card-${card.type}`}
              className={`suggested-card ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectType(isSelected ? null : card.type)}
              title={`Filter by ${card.label}`}
            >
              <div className="suggested-card-inner">
                <YellowFolderGraphic type={card.type} width={130} height={96} />
              </div>
              <span className="suggested-card-label">{card.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
