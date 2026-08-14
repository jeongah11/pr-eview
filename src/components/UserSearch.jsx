import { useState } from "react";
import { useFetch } from "../hooks/useFetch";
import { useDebounce } from "../hooks/useDebounce";

const BASE_URL = "https://api.github.com/search/users?q=";

export function UserSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  const { data, loading, error, refetch } = useFetch(
    debouncedQuery.trim() ? `${BASE_URL}${encodeURIComponent(debouncedQuery)}&per_page=10` : null,
    { cache: true, retries: 1 }
  );

  const users = data?.items ?? [];

  return (
    <div className="user-search">
      <input
        type="text"
        placeholder="GitHub 사용자 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="status">검색 중...</p>}
      {error && (
        <p className="status error">
          오류: {error} <button onClick={refetch}>재시도</button>
        </p>
      )}

      {!loading && !error && users.length === 0 && debouncedQuery && (
        <p className="status">검색 결과 없음</p>
      )}

      <ul className="user-list">
        {users.map((user) => (
          <li key={user.id}>
            <img src={user.avatar_url} alt={user.login} width={32} height={32} />
            <a href={user.html_url} target="_blank" rel="noreferrer">
              {user.login}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
