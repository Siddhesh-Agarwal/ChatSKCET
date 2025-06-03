"use server";

import parse from "node-html-parser";
import type { SearchResult, Response } from "./types";
import { OpenAI } from "openai";

async function getSearchResults(query: string, client: OpenAI): Promise<SearchResult[]> {
    // Assuming tool_calls and their elements might be undefined
    try {
        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    "role": "user",
                    "content": query,
                }
            ],
            tools: [
                {
                    type: "function",
                    function: {
                        name: "skcet_web_search",
                        description: "Search the SKCET Website for information.",
                        parameters: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "The search query to execute"
                                },
                            },
                            required: ["query"]
                        }
                    }
                }
            ],
            tool_choice: "auto",
            temperature: 0,
        })
        const toolCalls = response.choices[0]?.message?.tool_calls;
        if (!toolCalls || toolCalls.length == 0) {
            throw new Error("No tool calls found");
        }
        const searchQuery = toolCalls[0];
        if (searchQuery.function.name !== "skcet_web_search") {
            throw new Error("Invalid tool call");
        }
        return await getSearchResultsFromQuery(searchQuery.function.arguments);
    } catch {
        return []
    }
}

async function getSearchResultsFromQuery(query: string): Promise<SearchResult[]> {
    query = JSON.parse(query).query;

    // Construct DuckDuckGo search URL with site restriction
    const searchQuery = `${query} site:skcet.ac.in`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        return parseSearchResults(html, 5);

    } catch (error) {
        console.error('Search failed:', error);
        return [];
    }
}

function parseSearchResults(html: string, n: number): SearchResult[] {
    // Create a DOM parser (works in browser, you'll need jsdom for Node.js)
    const doc = parse(html);

    // DuckDuckGo's result containers
    const resultElements = doc.querySelectorAll('.result__body');

    const results: SearchResult[] = [];
    resultElements.forEach(element => {
        const urlElement = element.querySelector('.result__url');
        const titleElement = element.querySelector('.result__title a');
        const snippetElement = element.querySelector('.result__snippet');

        if (titleElement && snippetElement) {
            const url = urlElement?.textContent?.trim();
            const title = titleElement.textContent?.trim();
            const snippet = snippetElement.textContent?.trim();

            if (url && title && snippet && url.includes('skcet.ac.in')) {
                results.push({
                    url: url.startsWith('http') ? url : `https://${url}`,
                    title: title,
                    snippet: snippet,
                });
            }
        }
    });

    return results.slice(0, n);
}

export default async function generateResponse(query: string): Promise<Response> {
    const client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1"
    });

    const searchResults = await getSearchResults(query, client);

    const response = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
            {
                "role": "system",
                "content": `You are ChatSKCET, A Bot made to help solve user queries related to SKCET. SKCET stands for Shree Krishna College of Engineering and Technology. It is located  in Kuniyamuthur, Coimbatore, Tamil Nadu, India. The campus spans over a beautiful 52-acre area. It offers various Undergraduate (UG) and Postgraduate (PG) courses. All programs are approved by AICTE and affiliated to Anna University. SKCET boasts state-of-the-art facilities including modern laboratories, a well-stocked library, smart classrooms, sports facilities, and separate hostels for boys and girls. Answer the user's query based on the data given to you. Return only plain text (No Markdown).
        
        Data:
        ${searchResults.map((result) => `URL: ${result.url}\nTitle: ${result.title}\nSnippet: ${result.snippet}\n`).join('\n') || 'No search results found.'}`
            },
            {
                "role": "user",
                "content": query
            }
        ],
        temperature: 0.2,
    })

    const content = response.choices[0].message.content;

    if (!content) {
        throw new Error("We have encountered some problem.")
    }

    return {
        content: content,
        references: searchResults,
    }
};