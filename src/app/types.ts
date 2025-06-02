type SearchResult = {
    url: string;
    title: string;
    snippet: string;
}

type Message = {
    id: string;
    content: string;
    role: 'user';
} | {
    id: string;
    content: string;
    role: 'assistant';
    references: SearchResult[];
};

type Response = {
    content: string;
    references: SearchResult[];
};

export type { Message, Response, SearchResult };