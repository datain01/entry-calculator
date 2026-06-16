import React, { useState, useRef, useEffect } from 'react';
import pokemonData from './pokemon.json';
import typeChartData from './type_chart.json';

// 타입별 고유 색 코드 일람
const TYPE_COLORS = {
  "노말": "#949495", "불꽃": "#e56c3e", "물": "#5185c5", "풀": "#66a945", 
  "전기": "#fbb917", "얼음": "#6dc8eb", "격투": "#e09c40", "독": "#735198", 
  "땅": "#9c7743", "비행": "#a2c3e7", "에스퍼": "#dd6b7b", "벌레": "#9fa244", 
  "바위": "#bfb889", "고스트": "#684870", "드래곤": "#535ca8", "악": "#4c4948", 
  "강철": "#69a9c7", "페어리": "#dab4d4"
};

const ALL_TYPES = Object.keys(TYPE_COLORS);

// 한글 초성 추출 함수 (초성 검색용)
function getChosung(str) {
  const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code >= 0 && code <= 11172) {
      result += cho[Math.floor(code / 588)];
    } else {
      result += str.charAt(i);
    }
  }
  return result;
}

// 상세 상성 계산 함수
function evaluateDetailedMatchup(myMoveTypes, myBodyTypes, vsMoveTypes, vsBodyTypes) {
  let attackScore = 0;
  let defenseScore = 0;
  let strongMoves = []; 
  let dangerousVsMoves = []; 

  for (const moveType of myMoveTypes) {
    let multiplier = 1.0;
    for (const vsType of vsBodyTypes) {
      multiplier *= (typeChartData[moveType]?.[vsType] ?? 1.0);
    }
    if (multiplier >= 2) {
      attackScore += (multiplier === 4 ? 5 : 3);
      if (!strongMoves.includes(moveType)) strongMoves.push(moveType);
    }
    if (multiplier === 0.5) attackScore -= 1;
    if (multiplier === 0) attackScore -= 2;
  }

  let hitCount = 0;
  for (const vsMoveType of vsMoveTypes) {
    let multiplier = 1.0;
    for (const myType of myBodyTypes) {
      multiplier *= (typeChartData[vsMoveType]?.[myType] ?? 1.0);
    }

    if (multiplier >= 2) {
      defenseScore -= (multiplier === 4 ? 5 : 3);
      if (!dangerousVsMoves.includes(vsMoveType)) dangerousVsMoves.push(vsMoveType);
    } else if (multiplier <= 0.5) {
      defenseScore += (multiplier === 0 ? 4 : multiplier === 0.25 ? 3 : 2);
      hitCount++;
    }
  }

  const hasDefenseAdvantage = hitCount > 0 && dangerousVsMoves.length === 0;

  return { 
    attackScore, 
    defenseScore, 
    isAdvantageousAttack: strongMoves.length > 0, 
    strongMoves, 
    isAdvantageousDefense: hasDefenseAdvantage, 
    dangerousVsMoves 
  };
}

// 복합타입 반반 그라디언트 배지 컴포넌트
function PokemonTypeBadge({ types }) {
  if (!types || types.length === 0) return null;

  let backgroundStyle = '';
  if (types.length === 1) {
    backgroundStyle = TYPE_COLORS[types[0]] || '#64748b';
  } else {
    const color1 = TYPE_COLORS[types[0]] || '#64748b';
    const color2 = TYPE_COLORS[types[1]] || '#64748b';
    backgroundStyle = `linear-gradient(90deg, ${color1} 50%, ${color2} 50%)`;
  }

  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#fff',
      background: backgroundStyle,
      padding: '2px 6px',
      borderRadius: '4px',
      marginLeft: '6px',
      display: 'inline-block',
      textShadow: '0px 1px 2px rgba(0,0,0,0.4)',
      verticalAlign: 'middle'
    }}>
      {types.join('/')}
    </span>
  );
}

// 검색형 기술 및 인덱스용 공용 타입 드롭다운 컴포넌트
function MoveSelectDropdown({ value, onChange, placeholder = "타입 검색...", showRemove = true, onRemove }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const dropdownRef = useRef(null);

  const filteredTypes = ALL_TYPES.filter(t => t.includes(search));

  useEffect(() => {
    setHighlightedIdx(0);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(prev => (prev + 1) % filteredTypes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(prev => (prev - 1 + filteredTypes.length) % filteredTypes.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTypes[highlightedIdx]) {
        onChange(filteredTypes[highlightedIdx]);
        setIsOpen(false);
        setSearch('');
      }
    } else if (e.key === 'Escape') setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        onContextMenu={(e) => { 
          if (showRemove && onRemove) {
            e.preventDefault(); 
            onRemove(); 
          }
        }}
        title={showRemove ? "좌클릭: 변경 / 우클릭: 슬롯 삭제" : "좌클릭: 타입 선택"}
        style={{
          background: TYPE_COLORS[value] || '#fff',
          color: value ? '#fff' : '#64748b',
          border: value ? 'none' : '1px solid #cbd5e1',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: value ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
          userSelect: 'none',
          height: '24px',
          boxSizing: 'border-box'
        }}
      >
        <span>{value || "선택 안 함"}</span>
        <span style={{ fontSize: '9px', opacity: 0.7 }}>▼</span>
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '4px', zIndex: 150, width: '130px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', padding: '4px' }}>
          <input 
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', padding: '4px', marginBottom: '4px', fontSize: '11px' }}
          />
          <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
            {!showRemove && (
              <div 
                onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}
                style={{ padding: '4px 6px', cursor: 'pointer', fontSize: '12px', color: '#64748b', borderRadius: '3px', fontStyle: 'italic' }}
              >
                선택 안 함
              </div>
            )}
            {filteredTypes.map((t, idx) => (
              <div
                key={t}
                onClick={() => { onChange(t); setIsOpen(false); setSearch(''); }}
                onMouseEnter={() => setHighlightedIdx(idx)}
                style={{ padding: '4px 6px', background: idx === highlightedIdx ? '#e0f2fe' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '12px', borderRadius: '3px' }}
              >
                <span style={{ display: 'inline-block', width: '10px', height: '10px', background: TYPE_COLORS[t], borderRadius: '50%', marginRight: '6px' }}></span>
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [myEntry, setMyEntry] = useState(() => {
    const saved = localStorage.getItem('myBattleEntry');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [vsEntry, setVsEntry] = useState(() => {
    const saved = localStorage.getItem('vsBattleEntry');
    return saved ? JSON.parse(saved) : [];
  });

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [searchMy, setSearchMy] = useState('');
  const [searchVs, setSearchVs] = useState('');
  const [focusedMyIndex, setFocusedMyIndex] = useState(-1);
  const [focusedVsIndex, setFocusedVsIndex] = useState(-1);
  const [showTooltip, setShowTooltip] = useState(false);
  const [openMoveSlot, setOpenMoveSlot] = useState(null);

  const [activeTab, setActiveTab] = useState('dashboard');

  const [filterName, setFilterName] = useState('');       
  const [filterType1, setFilterType1] = useState('');     
  const [filterType2, setFilterType2] = useState('');     
  const [filterKeyword, setFilterKeyword] = useState(''); 
  const [filterAbility, setFilterAbility] = useState(''); 
  const [sortBy, setSortBy] = useState('id');             

  const myInputRef = useRef(null);
  const vsInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('myBattleEntry', JSON.stringify(myEntry));
  }, [myEntry]);

  useEffect(() => {
    localStorage.setItem('vsBattleEntry', JSON.stringify(vsEntry));
  }, [vsEntry]);

  const clearAllEntries = () => {
    setMyEntry([]);
    setVsEntry([]);
  };

  const clearMyEntry = () => {
    setMyEntry([]);
  };

  const clearVsEntry = () => {
    setVsEntry([]);
  };

  const resetSearchFilters = () => {
    setFilterName('');
    setFilterType1('');
    setFilterType2('');
    setFilterKeyword('');
    setFilterAbility('');
    sortBy !== 'id' && setSortBy('id'); 
  };

  const matchPokemon = (pokeName, searchKeyword) => {
    const cleanKeyword = searchKeyword.toLowerCase().replace(/\s+/g, '');
    if (!cleanKeyword) return false;
    const cleanName = pokeName.toLowerCase().replace(/\s+/g, '');
    
    const isChosungOnly = /^[ㄱ-ㅎ]+$/.test(cleanKeyword);
    if (isChosungOnly) {
      return getChosung(cleanName).includes(cleanKeyword);
    }
    return cleanName.includes(cleanKeyword);
  };

  const filteredMyList = searchMy ? pokemonData.filter(p => matchPokemon(p.name, searchMy)).slice(0, 5) : [];
  const filteredVsList = searchVs ? pokemonData.filter(p => matchPokemon(p.name, searchVs)).slice(0, 5) : [];

  const advancedSearchResult = pokemonData.filter(p => {
    if (filterName && !matchPokemon(p.name, filterName)) return false;

    if (filterType1 && !p.types.includes(filterType1)) return false;
    if (filterType2 && !p.types.includes(filterType2)) return false;
    
    if (filterKeyword) {
      const cleanKeyword = filterKeyword.toLowerCase().replace(/\s+/g, '');
      const matchCategory = p.category?.toLowerCase().replace(/\s+/g, '').includes(cleanKeyword);
      const matchDescription = p.description?.toLowerCase().replace(/\s+/g, '').includes(cleanKeyword);
      if (!matchCategory && !matchDescription) return false;
    }

    if (filterAbility) {
      const cleanAbilityInput = filterAbility.toLowerCase().replace(/\s+/g, '');
      const hasAbility = p.abilities?.some(a => a.toLowerCase().replace(/\s+/g, '').includes(cleanAbilityInput));
      if (!hasAbility) return false;
    }
    
    return true;
  }).sort((a, b) => {
    if (sortBy === 'attack') return (b.stats?.attack ?? 0) - (a.stats?.attack ?? 0);
    if (sortBy === 'speed') return (b.stats?.speed ?? 0) - (a.stats?.speed ?? 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return (a.id ?? 0) - (b.id ?? 0); 
  });

  const addToMyEntry = (pokemon) => {
    if (myEntry.length >= 6) return alert("내 엔트리는 최대 6마리까지입니다.");
    if (myEntry.some(p => p.formId === pokemon.formId)) return alert("이미 등록된 포켓몬입니다.");
    setMyEntry([...myEntry, { ...pokemon, moveTypes: [...pokemon.types] }]);
    setSearchMy('');
    setFocusedMyIndex(-1);
  };

  const addToVsEntry = (pokemon) => {
    if (vsEntry.length >= 6) return alert("상대 엔트리는 최대 6마리까지입니다.");
    if (vsEntry.some(p => p.formId === pokemon.formId)) return alert("이미 등록된 포켓몬입니다.");
    setVsEntry([...vsEntry, { ...pokemon, moveTypes: [...pokemon.types] }]);
    setSearchVs('');
    setFocusedVsIndex(-1);
  };

  const handleMyMoveTypeChange = (formId, moveIndex, newType) => {
    setMyEntry(myEntry.map(p => p.formId !== formId ? p : { ...p, moveTypes: p.moveTypes.map((m, i) => i === moveIndex ? newType : m) }));
  };

  const handleVsMoveTypeChange = (formId, moveIndex, newType) => {
    setVsEntry(vsEntry.map(p => {
      if (p.formId !== formId) return p;
      if (p.moveTypes.length <= 1) { alert("최소 1개의 기술 타입은 지정해야 합니다."); return p; }
      return { ...p, moveTypes: p.moveTypes.filter((_, idx) => idx !== moveIndex) };
    }));
  };

  const removeMyMoveSlot = (formId, moveIndex) => {
    setMyEntry(myEntry.map(p => {
      if (p.formId !== formId) return p;
      if (p.moveTypes.length <= 1) { alert("최소 1개의 기술 타입은 지정해야 합니다."); return p; }
      return { ...p, moveTypes: p.moveTypes.filter((_, idx) => idx !== moveIndex) };
    }));
  };

  const removeVsMoveSlot = (formId, moveIndex) => {
    setVsEntry(vsEntry.map(p => {
      if (p.formId !== formId) return p;
      if (p.moveTypes.length <= 1) { alert("최소 1개의 기술 타입은 지정해야 합니다."); return p; }
      return { ...p, moveTypes: p.moveTypes.filter((_, idx) => idx !== moveIndex) };
    }));
  };

  const addMyMoveSlot = (formId) => {
    setMyEntry(myEntry.map(p => {
      if (p.formId !== formId) return p;
      if (p.moveTypes.length < 4) {
        const nextMoves = [...p.moveTypes, "노말"];
        setOpenMoveSlot({ formId, index: nextMoves.length - 1 });
        return { ...p, moveTypes: nextMoves };
      }
      return p;
    }));
  };

  const addVsMoveSlot = (formId) => {
    setVsEntry(vsEntry.map(p => {
      if (p.formId !== formId) return p;
      if (p.moveTypes.length < 4) {
        const nextMoves = [...p.moveTypes, "노말"];
        setOpenMoveSlot({ formId, index: nextMoves.length - 1 });
        return { ...p, moveTypes: nextMoves };
      }
      return p;
    }));
  };

  const handleMyKeyDown = (e) => {
    if (e.key === 'Tab') { e.preventDefault(); vsInputRef.current?.focus(); return; }
    if (e.key === 'Delete' && searchMy === '') {
      e.preventDefault();
      if (myEntry.length > 0) setMyEntry(myEntry.slice(0, -1));
      return;
    }
    if (filteredMyList.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedMyIndex(prev => (prev + 1) % filteredMyList.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedMyIndex(prev => (prev - 1 + filteredMyList.length) % filteredMyList.length); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedMyIndex >= 0 && focusedMyIndex < filteredMyList.length) addToMyEntry(filteredMyList[focusedMyIndex]);
      else if (filteredMyList.length > 0) addToMyEntry(filteredMyList[0]);
    } else if (e.key === 'Escape') setSearchMy('');
  };

  const handleVsKeyDown = (e) => {
    if (e.key === 'Tab') { e.preventDefault(); myInputRef.current?.focus(); return; }
    if (e.key === 'Delete' && searchVs === '') {
      e.preventDefault();
      if (vsEntry.length > 0) setVsEntry(vsEntry.slice(0, -1));
      return;
    }
    if (filteredVsList.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedVsIndex(prev => (prev + 1) % filteredVsList.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedVsIndex(prev => (prev - 1 + filteredVsList.length) % filteredVsList.length); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedVsIndex >= 0 && focusedVsIndex < filteredVsList.length) addToVsEntry(filteredVsList[focusedVsIndex]);
      else if (filteredVsList.length > 0) addToVsEntry(filteredVsList[0]);
    } else if (e.key === 'Escape') setSearchVs('');
  };

  const getRecommendations = () => {
    if (myEntry.length === 0 || vsEntry.length === 0) return [];

    return myEntry.map(myPoke => {
      let totalAttack = 0;
      let totalDefense = 0;
      let strongMatchups = {}; 
      let weakMatchups = {};   
      let wallAgainst = [];    
      let speedOutrunList = [];

      vsEntry.forEach(vsPoke => {
        const vsMoves = vsPoke.moveTypes || vsPoke.types;
        const { attackScore, defenseScore, isAdvantageousAttack, strongMoves, isAdvantageousDefense, dangerousVsMoves } = 
          evaluateDetailedMatchup(myPoke.moveTypes, myPoke.types, vsMoves, vsPoke.types);
          
        totalAttack += attackScore;
        totalDefense += defenseScore;

        if (isAdvantageousAttack && strongMoves.length > 0) strongMatchups[vsPoke.name] = strongMoves;
        if (dangerousVsMoves.length > 0) weakMatchups[vsPoke.name] = dangerousVsMoves;
        if (isAdvantageousDefense) wallAgainst.push(vsPoke.name);
        if (myPoke.stats && vsPoke.stats && myPoke.stats.speed > vsPoke.stats.speed) speedOutrunList.push(vsPoke.name);
      });

      if (speedOutrunList.length > 0) totalAttack += 2;

      return {
        ...myPoke,
        attackScore: totalAttack,
        defenseScore: totalDefense,
        totalScore: totalAttack + totalDefense,
        strongMatchups,
        weakMatchups,
        wallAgainst,
        speedOutrunList
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  };

  const recommendedList = getRecommendations();

  const renderStats = (stats) => {
    if (!stats) return null;
    const isPhysicalAtk = stats.attack >= stats.spAtk;
    const isPhysicalDef = stats.defense >= stats.spDef;

    return (
      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px', display: 'flex', gap: '5px', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
        <span>H: {stats.hp}</span> | 
        <span style={{ color: isPhysicalAtk ? '#ef4444' : '#475569', fontWeight: isPhysicalAtk ? 'bold' : 'normal' }}>A: {stats.attack}</span> | 
        <span style={{ color: !isPhysicalAtk ? '#ef4444' : '#475569', fontWeight: !isPhysicalAtk ? 'bold' : 'normal' }}>C: {stats.spAtk}</span> | 
        <span style={{ color: isPhysicalDef ? '#2563eb' : '#475569', fontWeight: isPhysicalDef ? 'bold' : 'normal' }}>B: {stats.defense}</span> | 
        <span style={{ color: !isPhysicalDef ? '#2563eb' : '#475569', fontWeight: !isPhysicalDef ? 'bold' : 'normal' }}>D: {stats.spDef}</span> | 
        <span>S: {stats.speed}</span>
      </div>
    );
  };

  return (
    <div style={{ padding: '10px 20px', fontFamily: 'sans-serif', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', maxWidth: '100%', width: '100%', overflowY: 'visible' }}>
      
      {/* 상단 헤더 영역 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', margin: '0 0 10px 0', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', textAlign: 'center' }}> 엔트리 선출 추천기</h2>
        
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button 
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'help', color: '#475569', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            💡 사용법 확인
          </button>
          
          <button 
            onClick={clearMyEntry}
            style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer', color: '#2563eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            🔵 내 엔트리 비우기
          </button>

          <button 
            onClick={clearVsEntry}
            style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #fecdd3', background: '#fff1f2', cursor: 'pointer', color: '#dc2626', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            🔴 상대 엔트리 비우기
          </button>

          <button 
            onClick={clearAllEntries}
            style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f1f5f9', cursor: 'pointer', color: '#475569', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            🧹 전체 비우기
          </button>
        </div>

        {showTooltip && (
          <div style={{ position: 'absolute', top: '35px', left: '50%', transform: 'translateX(-50%)', zIndex: 200, width: 'calc(100% - 40px)', maxWidth: '430px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px 15px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px', lineHeight: '1.6', color: '#334155' }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px', color: '#1e293b' }}>🎮 조작 방법 및 단축키 안내</div>
            <ul style={{ margin: 0, paddingLeft: '15px', listStyleType: 'disc', marginBottom: '10px' }}>
              <li><strong>초성 검색 지원!</strong> 검색창에 <code>ㅁㄱㅇㅅ</code>처럼 초성만 쳐도 포켓몬이 바로 매칭됩니다.</li>
              <li><strong>포켓몬 검색:</strong> 이름 입력 후 <code>방향키 위아래</code> 후 <code>Enter</code> 키로 추가 가능합니다.</li>
              <li><strong>포켓몬 삭제:</strong> 검색창이 비어있을 때 <code>Delete</code> 키를 누르면 마지막 포켓몬이 삭제됩니다.</li>
              <li><strong>기술 빠른 삭제:</strong> 기술 배지 위에서 마우스 <code>우클릭</code>을 누르면 슬롯이 즉시 제거됩니다.</li>
            </ul>
          </div>
        )}
      </div>

      {/* 대시보드 메인 레이아웃 */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0, flexWrap: 'wrap' }}>
        
        {/* ==================== LEFT SIDE: 엔트리 패널 ==================== */}
        <div style={{ flex: '1 1 450px', display: 'flex', gap: '12px', minHeight: '400px', flexWrap: 'wrap' }}>
          
          {/* 내 엔트리 패널 */}
          <div style={{ flex: '1 1 210px', border: '1px solid #ddd', padding: '12px', borderRadius: '8px', background: '#f8fafc', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>🔵 내 엔트리 ({myEntry.length}/6)</h4>
            <input 
              ref={myInputRef}
              type="text" 
              placeholder="내 포켓몬 검색... (delete 키로 마지막 포켓몬 삭제)" 
              value={searchMy}
              onChange={(e) => { setSearchMy(e.target.value); setFocusedMyIndex(-1); }}
              onKeyDown={handleMyKeyDown}
              style={{ width: '100%', padding: '6px 10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', marginBottom: '8px' }}
            />
            {filteredMyList.length > 0 && (
              <ul style={{ position: 'absolute', top: '75px', width: 'calc(100% - 24px)', background: '#fff', border: '1px solid #ccc', zIndex: 110, listStyle: 'none', padding: 0, margin: 0, borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {filteredMyList.map((p, idx) => (
                  <li key={p.formId} onClick={() => addToMyEntry(p)} style={{ padding: '8px', cursor: 'pointer', background: idx === focusedMyIndex ? '#e0f2fe' : '#fff', fontSize: '13px' }}>
                    <strong>{p.name}</strong> <PokemonTypeBadge types={p.types} />
                  </li>
                ))}
              </ul>
            )}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
              {myEntry.map(p => (
                <div key={p.formId} style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{p.name} <PokemonTypeBadge types={p.types} /></span>
                    <button onClick={() => setMyEntry(myEntry.filter(item => item.formId !== p.formId))} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>삭제</button>
                  </div>
                  {renderStats(p.stats)}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginRight: '2px' }}>사용 기술 타입:</span>
                    {p.moveTypes.map((moveType, mIdx) => (
                      <MoveSelectDropdown key={mIdx} value={moveType} showRemove={true} isOpenInitially={openMoveSlot?.formId === p.formId && openMoveSlot?.index === mIdx} onChange={(newType) => { handleMyMoveTypeChange(p.formId, mIdx, newType); setOpenMoveSlot(null); }} onRemove={() => removeMyMoveSlot(p.formId, mIdx)} />
                    ))}
                    {p.moveTypes.length < 4 && <button onClick={() => addMyMoveSlot(p.formId)} style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px dashed #64748b', background: '#fff', cursor: 'pointer' }}>+ 추가</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 상대 엔트리 패널 */}
          <div style={{ flex: '1 1 210px', border: '1px solid #ddd', padding: '12px', borderRadius: '8px', background: '#fff5f5', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>🔴 상대 엔트리 ({vsEntry.length}/6)</h4>
            <input 
              ref={vsInputRef}
              type="text" 
              placeholder="상대 포켓몬 검색... (delete 키로 마지막 포켓몬 삭제)" 
              value={searchVs}
              onChange={(e) => { setSearchVs(e.target.value); setFocusedVsIndex(-1); }}
              onKeyDown={handleVsKeyDown}
              style={{ width: '100%', padding: '6px 10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', marginBottom: '8px' }}
            />
            {filteredVsList.length > 0 && (
              <ul style={{ position: 'absolute', top: '75px', width: 'calc(100% - 24px)', background: '#fff', border: '1px solid #ccc', zIndex: 110, listStyle: 'none', padding: 0, margin: 0, borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {filteredVsList.map((p, idx) => (
                  <li key={p.formId} onClick={() => addToVsEntry(p)} style={{ padding: '10px', cursor: 'pointer', background: idx === focusedVsIndex ? '#fee2e2' : '#fff', fontSize: '13px' }}>
                    <strong>{p.name}</strong> <PokemonTypeBadge types={p.types} />
                  </li>
                ))}
              </ul>
            )}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
              {vsEntry.map(p => (
                <div key={p.formId} style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{p.name} <PokemonTypeBadge types={p.types} /></span>
                    <button onClick={() => setVsEntry(vsEntry.filter(item => item.formId !== p.formId))} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>삭제</button>
                  </div>
                  {renderStats(p.stats)}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginRight: '2px' }}>사용 기술 타입:</span>
                    {p.moveTypes.map((moveType, mIdx) => (
                      <MoveSelectDropdown key={mIdx} value={moveType} showRemove={true} isOpenInitially={openMoveSlot?.formId === p.formId && openMoveSlot?.index === mIdx} onChange={(newType) => { handleVsMoveTypeChange(p.formId, mIdx, newType); setOpenMoveSlot(null); }} onRemove={() => removeVsMoveSlot(p.formId, mIdx)} />
                    ))}
                    {p.moveTypes.length < 4 && <button onClick={() => addVsMoveSlot(p.formId)} style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px dashed #dc2626', background: '#fff', cursor: 'pointer' }}>+ 추가</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ==================== RIGHT SIDE: 우측 탭 패널 통합 관리 ==================== */}
        <div style={{ flex: '1 1 450px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* 상단 탭 대분류 */}
          <div style={{ display: 'flex', background: '#cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
            <button 
              onClick={() => setActiveTab('dashboard')}
              style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeTab === 'dashboard' ? '#f8fafc' : '#e2e8f0', color: activeTab === 'dashboard' ? '#1e293b' : '#64748b', transition: 'background 0.2s' }}
            >
              📊 너로 정했다
            </button>
            <button 
              onClick={() => setActiveTab('searchPage')}
              style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeTab === 'searchPage' ? '#f8fafc' : '#e2e8f0', color: activeTab === 'searchPage' ? '#1e293b' : '#64748b', transition: 'background 0.2s' }}
            >
              🔍 무슨 포켓몬이더라
            </button>
          </div>

          <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* 1번 탭: 배틀 분석 대시보드 */}
            {activeTab === 'dashboard' && (
              <>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>선출 추천 리스트</h3>
                {recommendedList.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', minHeight: '200px' }}>
                    양쪽 엔트리에 포켓몬을 등록하면 상성 리포트 격자가 실시간 연산됩니다.
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: windowWidth > 576 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(1, minmax(0, 1fr))',
                    gap: '10px', 
                    alignContent: 'start'
                  }}>
                    {recommendedList.map((p, index) => (
                      <div key={p.formId} style={{ background: '#fff', borderRadius: '6px', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', borderLeft: index === 0 ? '5px solid #22c55e' : '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', fontSize: '12px', height: 'fit-content' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
                            {index + 1}위. {p.name} <PokemonTypeBadge types={p.types} />
                          </span>
                          <span style={{ fontWeight: 'bold' }}>스코어: <span style={{ color: p.totalScore >= 0 ? '#2563eb' : '#dc2626' }}>{p.totalScore}점</span></span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', color: '#475569', background: '#f1f5f9', padding: '4px 6px', borderRadius: '4px', marginBottom: '6px' }}>
                          <div>공격 포인트: {p.attackScore}점</div>
                          <div>방어 포인트: {p.defenseScore}점</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ fontWeight: 'bold', color: '#ea580c' }}>선공가능:</span> <span style={{ color: '#ea580c', fontWeight: '500' }}>{p.speedOutrunList.length > 0 ? p.speedOutrunList.join(', ') : '없음'}</span></div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ fontWeight: 'bold', color: '#ef4444' }}>공격유리:</span> {Object.keys(p.strongMatchups).length > 0 ? Object.entries(p.strongMatchups).map(([vN, mT]) => <span key={vN} style={{ marginRight: '6px', color: '#ef4444' }}>{vN}({mT})</span>) : '없음'}</div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ fontWeight: 'bold', color: '#1d4ed8' }}>방어유리:</span> <span style={{ color: '#1d4ed8', fontWeight: '500' }}>{p.wallAgainst.length > 0 ? p.wallAgainst.join(', ') : '없음'}</span></div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><span style={{ fontWeight: 'bold', color: '#60a5fa' }}>방어약점:</span> {Object.keys(p.weakMatchups).length > 0 ? Object.entries(p.weakMatchups).map(([vN, ms]) => <span key={vN} style={{ marginRight: '6px', color: '#2563eb' }}>{vN}({ms.join(',')})</span>) : <span style={{ color: '#22c55e' }}>안전</span>}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 2번 탭: 포켓몬 상세 조건 검색 색인창 */}
            {activeTab === 'searchPage' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '300px' }}>
                
                {/* 타이틀 우측 정렬 배치 라인 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 4px 0' }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>🔍 포켓몬 검색</h3>
                  {/* 💡 [기획 반영] 확실한 초록색 솔리드 테마 및 타이핑 드롭다운과 크기 맞춤 최적화 */}
                  <button
                    onClick={resetSearchFilters}
                    style={{
                      padding: '4px 14px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      borderRadius: '4px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#fff',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                      height: '24px', // 타입 인풋 창과 규격 동일화
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#15803d'}
                    onMouseLeave={(e) => e.target.style.background = '#16a34a'}
                  >
                    초기화
                  </button>
                </div>

                <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                  포켓몬 이름이 떠오르지 않을 때 포켓몬의 타입, 분류(예: 쥐, 강아지, 고양이), 도감 속 특징적 키워드, 이름 일부 등을 입력하여 찾을 수 있습니다.
                </p>
                
                {/* 조건 설정 영역 */}
                <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '10px', marginBottom: '12px' }}>
                  
                  {/* 이름 검색 필드 */}
                  <div style={{ flex: '1 1 110px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6' }}>포켓몬 이름</label>
                    <input 
                      type="text" 
                      placeholder="이름/초성 검색..." 
                      value={filterName} 
                      onChange={(e) => setFilterName(e.target.value)} 
                      style={{ padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }} 
                    />
                  </div>

                  {/* 타입 1 커스텀 검색 드롭다운 */}
                  <div style={{ flex: '1 1 110px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>타입 1</label>
                    <MoveSelectDropdown 
                      value={filterType1} 
                      onChange={(selectedType) => setFilterType1(selectedType)} 
                      placeholder="타입 1 검색..."
                      showRemove={false}
                    />
                  </div>

                  {/* 타입 2 커스텀 검색 드롭다운 */}
                  <div style={{ flex: '1 1 110px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>타입 2</label>
                    <MoveSelectDropdown 
                      value={filterType2} 
                      onChange={(selectedType) => setFilterType2(selectedType)} 
                      placeholder="타입 2 검색..."
                      showRemove={false}
                    />
                  </div>

                  {/* 분류/도감 설명 */}
                  <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#ea580c' }}>분류/도감 설명</label>
                    <input type="text" placeholder="예: 쥐, 강아지, 고양이" value={filterKeyword} onChange={(e) => setFilterKeyword(e.target.value)} style={{ padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }} />
                  </div>

                  {/* 특성 */}
                  <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>특성</label>
                    <input type="text" placeholder="예: 위협, 가속" value={filterAbility} onChange={(e) => setFilterAbility(e.target.value)} style={{ padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }} />
                  </div>

                  {/* 정렬 기준 */}
                  <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* 💡 [기획 반영] '정렬 기준' -> '정렬'로 축약 셋업 */}
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>정렬</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '3px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1', height: '24px', boxSizing: 'border-box' }}>
                      <option value="id">도감 번호순</option> 
                      <option value="name">가나다순</option>
                      <option value="attack">공격력 높은 순</option>
                      <option value="speed">스피드 높은 순</option>
                    </select>
                  </div>
                </div>

                {/* 결과 리스트 출력 영역 */}
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px' }}>
                  {advancedSearchResult.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>조건에 일치하는 포켓몬이 없습니다.</div>
                  ) : (
                    advancedSearchResult.slice(0, 30).map(p => (
                      <div key={p.formId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                        <div style={{ flex: 1, paddingRight: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginRight: '5px' }}>
                              No.{String(p.id).padStart(4, '0')}
                            </span>
                            <strong style={{ fontSize: '13px' }}>{p.name}</strong>
                            <PokemonTypeBadge types={p.types} />
                            {p.category && (
                              <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '1px 4px', borderRadius: '3px', marginLeft: '6px', border: '1px solid #e2e8f0' }}>
                                {p.category}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                            {renderStats(p.stats)}
                            <div style={{ margin: '2px 0' }}><span style={{ color: '#475569', fontWeight: '500' }}>특성:</span> {p.abilities?.join(', ') || '없음'}</div>
                            {p.description && <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '2px', wordBreak: 'break-all' }}>“{p.description}”</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button onClick={() => addToMyEntry(p)} style={{ padding: '3px 6px', fontSize: '11px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ 내팀</button>
                          <button onClick={() => addToVsEntry(p)} style={{ padding: '3px 6px', fontSize: '11px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ 상대</button>
                        </div>
                      </div>
                    ))
                  )}
                  {advancedSearchResult.length > 30 && (
                    <div style={{ padding: '6px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', background: '#f8fafc' }}>상위 30마리만 출력 중입니다. 조건을 좁혀보세요!</div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
      {/* 💡 [새로 추가] 최하단 푸터 저작권 및 법적 고지 영역 */}
      <footer style={{
        marginTop: '30px',
        padding: '15px 10px',
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center',
        fontSize: '11px',
        color: '#94a3b8',
        lineHeight: '1.6',
        letterSpacing: '-0.3px',
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <div style={{ fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>
          © {new Date().getFullYear()} Pokemon Battle Entry Recommender. All Rights Reserved.
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto', wordBreak: 'keep-all' }}>
          본 서비스는 실전 포켓몬스터 배틀을 돕기 위해 비공식적으로 제작된 웹 페이지입니다.
          서비스에 사용된 포켓몬 명칭, 데이터, 이미지, 관련 디자인 및 저작권은 전적으로 
          Nintendo, Creatures Inc., GAME FREAK, 및 (주)포켓몬코리아에 소유권이 있습니다.
        </div>
      </footer>
    </div>
  );
}

export default App;