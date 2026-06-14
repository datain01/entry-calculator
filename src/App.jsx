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

// 상세 상성 계산 함수
function evaluateDetailedMatchup(myMoveTypes, myBodyTypes, vsMoveTypes, vsBodyTypes) {
  let attackScore = 0;
  let defenseScore = 0;
  let strongMoves = []; 
  let dangerousVsMoves = []; 

  // 1. 내 공격 상성 계산
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

  // 2. 내 방어 상성 계산
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

// 검색형 기술 드롭다운 컴포넌트 (자동 오픈 감지 추가)
function MoveSelectDropdown({ value, onChange, onRemove, isOpenInitially = false }) {
  const [isOpen, setIsOpen] = useState(isOpenInitially);
  const [search, setSearch] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const dropdownRef = useRef(null);

  const filteredTypes = ALL_TYPES.filter(t => t.includes(search));

  // isOpenInitially 값이 외부에서 true로 바뀌면 동기화하여 열어줌
  useEffect(() => {
    if (isOpenInitially) {
      setIsOpen(true);
    }
  }, [isOpenInitially]);

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
        onContextMenu={(e) => { e.preventDefault(); onRemove(); }}
        title="좌클릭: 변경 / 우클릭: 슬롯 삭제"
        style={{
          background: TYPE_COLORS[value] || '#fff',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          userSelect: 'none'
        }}
      >
        <span>{value}</span>
        <span style={{ fontSize: '9px' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '4px', zIndex: 150, width: '130px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', padding: '4px' }}>
          <input 
            type="text"
            placeholder="타입 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', padding: '4px', marginBottom: '4px', fontSize: '11px' }}
          />
          <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
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

  const [searchMy, setSearchMy] = useState('');
  const [searchVs, setSearchVs] = useState('');
  const [focusedMyIndex, setFocusedMyIndex] = useState(-1);
  const [focusedVsIndex, setFocusedVsIndex] = useState(-1);
  const [showTooltip, setShowTooltip] = useState(false);

  // 새로 추가된 기술 슬롯 자동 편집 타겟 상태 관리 ({ formId, index } 구조)
  const [openMoveSlot, setOpenMoveSlot] = useState(null);

  const myInputRef = useRef(null);
  const vsInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('myBattleEntry', JSON.stringify(myEntry));
  }, [myEntry]);

  useEffect(() => {
    localStorage.setItem('vsBattleEntry', JSON.stringify(vsEntry));
  }, [vsEntry]);

  const clearAllEntries = () => {
    if (window.confirm("내 엔트리와 상대 엔트리를 모두 비우시겠습니까?")) {
      setMyEntry([]);
      setVsEntry([]);
    }
  };

  const filteredMyList = searchMy 
    ? pokemonData.filter(p => p.name.toLowerCase().replace(/\s+/g, '').includes(searchMy.toLowerCase().replace(/\s+/g, ''))).slice(0, 5) 
    : [];
  const filteredVsList = searchVs 
    ? pokemonData.filter(p => p.name.toLowerCase().replace(/\s+/g, '').includes(searchVs.toLowerCase().replace(/\s+/g, ''))).slice(0, 5) 
    : [];

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
    setVsEntry(vsEntry.map(p => p.formId !== formId ? p : { ...p, moveTypes: p.moveTypes.map((m, i) => i === moveIndex ? newType : m) }));
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

  // 기술 추가 로직 완료 후 바로 타겟 인덱스를 기억하도록 지정
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
    // 어느 쪽 종족값이 더 높은지 비교 조건문
    const isPhysicalAtk = stats.attack >= stats.spAtk;
    const isPhysicalDef = stats.defense >= stats.spDef;

    return (
      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px', display: 'flex', gap: '5px', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
        <span>H: {stats.hp}</span> | 
        {/* 공격/특공 중 높은 쪽에만 빨간색(#ef4444)과 볼드 적용 */}
        <span style={{ color: isPhysicalAtk ? '#ef4444' : '#475569', fontWeight: isPhysicalAtk ? 'bold' : 'normal' }}>A: {stats.attack}</span> | 
        <span style={{ color: !isPhysicalAtk ? '#ef4444' : '#475569', fontWeight: !isPhysicalAtk ? 'bold' : 'normal' }}>C: {stats.spAtk}</span> | 
        {/* 방어/특방 중 높은 쪽에만 파란색(#2563eb)과 볼드 적용 */}
        <span style={{ color: isPhysicalDef ? '#2563eb' : '#475569', fontWeight: isPhysicalDef ? 'bold' : 'normal' }}>B: {stats.defense}</span> | 
        <span style={{ color: !isPhysicalDef ? '#2563eb' : '#475569', fontWeight: !isPhysicalDef ? 'bold' : 'normal' }}>D: {stats.spDef}</span> | 
        <span>S: {stats.speed}</span>
      </div>
    );
  };

  const renderAbilities = (abilities) => {
    if (!abilities || abilities.length === 0) return null;
    return (
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ fontWeight: 'bold', color: '#475569' }}>특성:</span> {abilities.join(' / ')}
      </div>
    );
  };

  return (
    <div style={{ padding: '10px 20px', fontFamily: 'sans-serif', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '100%', width: '100%' }}>
      
      {/* 상단 헤더 영역 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', margin: '0 0 10px 0' }}>
        <h2 style={{ margin: 0, fontSize: '22px' }}>엔트리 추천 계산기</h2>
        
        <button 
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          style={{
            marginLeft: '15px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: '#fff',
            cursor: 'help',
            color: '#475569',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          💡 사용법 확인
        </button>

        <button 
          onClick={clearAllEntries}
          style={{
            marginLeft: '10px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '4px',
            border: '1px solid #fecdd3',
            background: '#fff1f2',
            cursor: 'pointer',
            color: '#e11d48',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          🧹 엔트리 전체 비우기
        </button>

        {showTooltip && (
          <div style={{
            position: 'absolute',
            top: '35px',
            left: 'calc(50% + 100px)',
            zIndex: 200,
            width: '430px',
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '12px 15px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '12px',
            lineHeight: '1.6',
            color: '#334155'
          }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', marginBottom: '8px', color: '#1e293b' }}>🎮 조작 방법 및 단축키 안내</div>
            <ul style={{ margin: 0, paddingLeft: '15px', listStyleType: 'disc', marginBottom: '10px' }}>
              <li><strong>포켓몬 검색:</strong> 이름 일부 입력 후 <code>방향키 위아래</code>로 커서 이동, <code>Enter</code> 키로 즉시 추가 가능합니다.</li>
              <li><strong>빠른 검색창 전환:</strong> <code>Tab</code> 키를 누르면 내 검색창과 상대 검색창을 자유롭게 오갈 수 있습니다.</li>
              <li><strong>엔트리 삭제:</strong> 검색창이 비어있을 때 <code>Delete</code> 키를 누르면 마지막으로 등록된 포켓몬이 즉시 삭제됩니다.</li>
              <li><strong>스킬 빌드 세팅:</strong> 포켓몬 추가 시 본체 타입이 기본 기술로 자동 매핑되며, 최대 4개까지 원하는 커스텀 공격 기술 타입을 추가할 수 있습니다.</li>
              <li><strong>기술 빠른 삭제:</strong> 지정된 기술 배지 위에서 마우스 <code>우클릭</code>을 누르면 드롭다운을 거치지 않고 슬롯이 즉시 제거됩니다.</li>
              <li><strong>💾 실시간 자동 저장:</strong> 모든 세팅 데이터는 브라우저 캐시에 상시 백업되어 새로고침 후에도 유지됩니다.</li>
            </ul>

            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', margin: '10px 0 6px 0', color: '#1e293b' }}>📊 분석 용어 정의</div>
            <ul style={{ margin: 0, paddingLeft: '15px', listStyleType: 'disc' }}>
              <li><strong>공격기여:</strong> 내 포켓몬의 기술들이 상대 엔트리의 약점을 찌를 때 가산되는 누적 공격 상성 점수입니다. (반감 이하는 감점)</li>
              <li><strong>대비안전:</strong> 상대 엔트리의 공격 기술들을 내 포켓몬이 얼마나 안전하게 받아낼 수 있는지를 계산한 방어 상성 점수입니다.</li>
              <li><strong style={{ color: '#ea580c' }}>선공가능:</strong> 내 포켓몬의 스피드 종족값이 상대 포켓몬의 스피드 종족값보다 빠를 때 매핑됩니다.</li>
              <li><strong style={{ color: '#ef4444' }}>공격유리:</strong> 상대 포켓몬의 방어 타입 약점(2배/4배)을 찌를 수 있는 기술 타입을 내가 보유하고 있을 때 활성화됩니다.</li>
              <li><strong style={{ color: '#1d4ed8' }}>방어유리:</strong> 상대 포켓몬이 가진 모든 기술 타입을 내 포켓몬 본체의 타입 상성으로 안전하게 반감 이하로 완벽히 받아낼 수 있을 때 표시됩니다.</li>
              <li><strong style={{ color: '#60a5fa' }}>방어약점:</strong> 상대 포켓몬이 채용한 공격 기술 타입 중, 내 본체의 약점을 찌르는 치명적인 스킬이 존재할 때 표시됩니다.</li>
            </ul>
          </div>
        )}
      </div>

      {/* 대시보드 메인 레이아웃 */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        
        {/* ==================== LEFT SIDE: 엔트리 패널 ==================== */}
        <div style={{ width: '50%', display: 'flex', gap: '12px', overflow: 'hidden' }}>
          
          {/* 내 엔트리 패널 */}
          <div style={{ flex: 1, border: '1px solid #ddd', padding: '12px', borderRadius: '8px', background: '#f8fafc', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>🔵 내 엔트리 ({myEntry.length}/6)</h4>
            <input 
              ref={myInputRef}
              type="text" 
              placeholder="내 포켓몬 검색..." 
              value={searchMy}
              onChange={(e) => { setSearchMy(e.target.value); setFocusedMyIndex(-1); }}
              onKeyDown={handleMyKeyDown}
              style={{ width: '100%', padding: '6px 10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', marginBottom: '8px' }}
            />
            {filteredMyList.length > 0 && (
              <ul style={{ position: 'absolute', top: '75px', width: 'calc(100% - 24px)', background: '#fff', border: '1px solid #ccc', zIndex: 110, listStyle: 'none', padding: 0, margin: 0, borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {filteredMyList.map((p, idx) => (
                  <li key={p.formId} onClick={() => addToMyEntry(p)} style={{ padding: '8px', cursor: 'pointer', background: idx === focusedMyIndex ? '#e0f2fe' : '#fff', fontSize: '13px' }}>
                    <strong>{p.name}</strong> 
                    <PokemonTypeBadge types={p.types} />
                  </li>
                ))}
              </ul>
            )}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
              {myEntry.map(p => (
                <div key={p.formId} style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {p.name} <PokemonTypeBadge types={p.types} />
                    </span>
                    <button onClick={() => setMyEntry(myEntry.filter(item => item.formId !== p.formId))} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>삭제</button>
                  </div>
                  {renderStats(p.stats)}
                  {renderAbilities(p.abilities)}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    {p.moveTypes.map((moveType, mIdx) => (
                      <MoveSelectDropdown 
                        key={mIdx} 
                        value={moveType} 
                        isOpenInitially={openMoveSlot?.formId === p.formId && openMoveSlot?.index === mIdx}
                        onChange={(newType) => {
                          handleMyMoveTypeChange(p.formId, mIdx, newType);
                          setOpenMoveSlot(null); 
                        }}
                        onRemove={() => removeMyMoveSlot(p.formId, mIdx)}
                      />
                    ))}
                    {p.moveTypes.length < 4 && <button onClick={() => addMyMoveSlot(p.formId)} style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px dashed #64748b', background: '#fff', cursor: 'pointer' }}>+ 추가</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 상대 엔트리 패널 */}
          <div style={{ flex: 1, border: '1px solid #ddd', padding: '12px', borderRadius: '8px', background: '#fff5f5', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>🔴 상대 엔트리 ({vsEntry.length}/6)</h4>
            <input 
              ref={vsInputRef}
              type="text" 
              placeholder="상대 포켓몬 검색..." 
              value={searchVs}
              onChange={(e) => { setSearchVs(e.target.value); setFocusedVsIndex(-1); }}
              onKeyDown={handleVsKeyDown}
              style={{ width: '100%', padding: '6px 10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', marginBottom: '8px' }}
            />
            {filteredVsList.length > 0 && (
              <ul style={{ position: 'absolute', top: '75px', width: 'calc(100% - 24px)', background: '#fff', border: '1px solid #ccc', zIndex: 110, listStyle: 'none', padding: 0, margin: 0, borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {filteredVsList.map((p, idx) => (
                  <li key={p.formId} onClick={() => addToVsEntry(p)} style={{ padding: '10px', cursor: 'pointer', background: idx === focusedVsIndex ? '#fee2e2' : '#fff', fontSize: '13px' }}>
                    <strong>{p.name}</strong> 
                    <PokemonTypeBadge types={p.types} />
                  </li>
                ))}
              </ul>
            )}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
              {vsEntry.map(p => (
                <div key={p.formId} style={{ background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {p.name} <PokemonTypeBadge types={p.types} />
                    </span>
                    <button onClick={() => setVsEntry(vsEntry.filter(item => item.formId !== p.formId))} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>삭제</button>
                  </div>
                  {renderStats(p.stats)}
                  {renderAbilities(p.abilities)}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                    {p.moveTypes.map((moveType, mIdx) => (
                      <MoveSelectDropdown 
                        key={mIdx} 
                        value={moveType} 
                        isOpenInitially={openMoveSlot?.formId === p.formId && openMoveSlot?.index === mIdx}
                        onChange={(newType) => {
                          handleVsMoveTypeChange(p.formId, mIdx, newType);
                          setOpenMoveSlot(null); 
                        }}
                        onRemove={() => removeVsMoveSlot(p.formId, mIdx)}
                      />
                    ))}
                    {p.moveTypes.length < 4 && <button onClick={() => addVsMoveSlot(p.formId)} style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px dashed #dc2626', background: '#fff', cursor: 'pointer' }}>+ 추가</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ==================== RIGHT SIDE: 분석 리포트 패널 ==================== */}
        <div style={{ width: '50%', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>배틀 선출 순위 및 종합 대시보드</h3>
          
          {recommendedList.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>
              양쪽 엔트리에 포켓몬을 등록하면 2x3 상성 리포트 격자가 실시간 연산됩니다.
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gridTemplateRows: 'auto auto auto', 
              gap: '10px', 
              flex: 1, 
              overflowY: 'auto',
              alignContent: 'start'
            }}>
              {recommendedList.map((p, index) => (
                <div 
                  key={p.formId} 
                  style={{ 
                    background: '#fff', 
                    borderRadius: '6px', 
                    padding: '10px 12px', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
                    border: '1px solid #e2e8f0',
                    borderLeft: index === 0 ? '5px solid #22c55e' : '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '12px',
                    height: 'fit-content'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
                      {index + 1}위. {p.name} <PokemonTypeBadge types={p.types} />
                      {index === 0 && <span style={{ color: '#22c55e', fontSize: '11px', marginLeft: '6px', fontWeight: 'bold' }}>최우선 추천</span>}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>
                      스코어: <span style={{ color: p.totalScore >= 0 ? '#2563eb' : '#dc2626' }}>{p.totalScore}점</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', color: '#475569', background: '#f1f5f9', padding: '4px 6px', borderRadius: '4px', marginBottom: '6px' }}>
                    <div>공격기여: {p.attackScore}점</div>
                    <div>대비안전: {p.defenseScore}점</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontWeight: 'bold', color: '#ea580c' }}>선공가능:</span>{' '}
                      <span style={{ color: '#ea580c', fontWeight: '500' }}>
                        {p.speedOutrunList.length > 0 ? p.speedOutrunList.join(', ') : <span style={{ color: '#94a3b8' }}>없음</span>}
                      </span>
                    </div>

                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontWeight: 'bold', color: '#ef4444' }}>공격유리:</span>{' '}
                      {Object.keys(p.strongMatchups).length > 0 ? (
                        Object.entries(p.strongMatchups).map(([vsName, moveType]) => (
                          <span key={vsName} style={{ marginRight: '6px', color: '#ef4444' }}>
                            {vsName}(<span style={{ color: TYPE_COLORS[moveType], fontWeight: 'bold' }}>{moveType}</span>)
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#94a3b8' }}>없음</span>
                      )}
                    </div>

                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontWeight: 'bold', color: '#1d4ed8' }}>방어유리:</span>{' '}
                      <span style={{ color: '#1d4ed8', fontWeight: '500' }}>
                        {p.wallAgainst.length > 0 ? p.wallAgainst.join(', ') : <span style={{ color: '#94a3b8' }}>없음</span>}
                      </span>
                    </div>

                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>방어약점:</span>{' '}
                      {Object.keys(p.weakMatchups).length > 0 ? (
                        Object.entries(p.weakMatchups).map(([vsName, moves]) => (
                          <span key={vsName} style={{ marginRight: '6px', color: '#2563eb' }}>
                            {vsName}({moves.map(m => <span key={m} style={{ color: TYPE_COLORS[m], fontWeight: 'bold', marginRight: '2px' }}>{m}</span>)})
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#22c55e' }}>안전</span>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;