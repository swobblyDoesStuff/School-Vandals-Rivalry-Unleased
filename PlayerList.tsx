import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { Player } from './types';

interface PlayerListProps {
  players: Player[];
  schools: { id: string; name: string; memberIds: string[] }[];
  onSelectPlayer?: (player: Player) => void;
  selectedPlayerId?: string;
}

const playerStatHeaders = [
  { key: 'name', label: "Player's Name" },
  { key: 'school', label: "Player's School" },
  { key: 'level', label: "Player's Level" },
  { key: 'xp', label: "Player's XP" },
  { key: 'tagsPlaced', label: 'Tags Laid' },
  { key: 'tagsCleaned', label: 'Tags Cleaned' },
  { key: 'treasuresFound', label: 'Treasures Found' },
];

const PlayerList: React.FC<PlayerListProps> = ({ players, schools, onSelectPlayer, selectedPlayerId }) => {
  const [sortBy, setSortBy] = useState('level');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const handleSort = (key: string) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else {
      setSortBy(key);
      setSortAsc(true);
    }
    setCurrentPage(0);
  };

  // Map schoolId to school name for fast lookup
  const schoolIdToNameMap: Record<string, string> = {};
  schools.forEach(school => {
    schoolIdToNameMap[school.id] = school.name;
  });
  const getPlayerSchool = (p: Player) => {
    if (p.schoolId) {
      return schoolIdToNameMap[p.schoolId] || '';
    }
    return '';
  };

  const sortedPlayers = [...players].sort((a, b) => {
    let aVal: any;
    let bVal: any;
    if (sortBy === 'school') {
      aVal = getPlayerSchool(a);
      bVal = getPlayerSchool(b);
    } else {
      aVal = a[sortBy as keyof Player];
      bVal = b[sortBy as keyof Player];
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedPlayers.length / itemsPerPage);
  const visiblePlayers = sortedPlayers.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-yellow-50 via-yellow-100 to-slate-100 p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={32} className="text-yellow-600" />
        <h2 className="text-2xl font-black text-yellow-700 uppercase">Player Rankings</h2>
      </div>
      <div className="flex-1 overflow-auto rounded-xl shadow bg-white border border-yellow-200">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-yellow-100 text-yellow-700">
              {playerStatHeaders.map(h => (
                <th
                  key={h.key}
                  className="p-2 cursor-pointer select-none hover:bg-yellow-200 transition-colors"
                  onClick={() => handleSort(h.key)}
                >
                  {h.label} {sortBy === h.key ? (sortAsc ? '▲' : '▼') : ''}
                </th>
              ))}
              {/* No actions column */}
            </tr>
          </thead>
          <tbody>
            {visiblePlayers.map((p, idx) => (
              <tr
                key={p.id}
                className={
                  `transition-colors ` +
                  (selectedPlayerId === p.id
                    ? 'bg-yellow-400 !important ring-2 ring-yellow-700'
                    : idx % 2 === 0
                    ? 'bg-yellow-50 hover:bg-yellow-100'
                    : 'hover:bg-yellow-100')
                }
                onClick={() => onSelectPlayer && onSelectPlayer(p)}
                style={{ cursor: onSelectPlayer ? 'pointer' : 'default' }}
              >
                <td className="p-2 font-bold text-slate-700">{p.name}</td>
                <td className="p-2 text-center">{getPlayerSchool(p)}</td>
                <td className="p-2 text-center">{p.level}</td>
                <td className="p-2 text-center">{p.xp}</td>
                <td className="p-2 text-center">{p.stats?.tagsPlaced ?? 0}</td>
                <td className="p-2 text-center">{p.stats?.tagsCleaned ?? 0}</td>
                <td className="p-2 text-center">{p.stats?.treasuresFound ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          className="px-3 py-1 rounded bg-yellow-200 text-yellow-800 font-bold disabled:opacity-50"
          onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          Prev
        </button>
        <span className="font-bold text-yellow-700">Page {currentPage + 1} / {totalPages}</span>
        <button
          className="px-3 py-1 rounded bg-yellow-200 text-yellow-800 font-bold disabled:opacity-50"
          onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={currentPage >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PlayerList;
