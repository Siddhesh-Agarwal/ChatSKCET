#!/usr/bin/env python
from typing import Iterator, Literal

import streamlit as st
from dotenv import load_dotenv
from langchain.embeddings.ollama import OllamaEmbeddings
from langchain.hub import pull
from langchain.llms.ollama import Ollama
from langchain.vectorstores.chroma import Chroma
from langchain_community.chat_message_histories.streamlit import (
    StreamlitChatMessageHistory,
)
from langchain_core.documents.base import Document
from langchain_core.output_parsers.string import StrOutputParser
from langchain_core.runnables.history import RunnableWithMessageHistory
# from langchain_openai import ChatOpenAI, OpenAIEmbeddings

load_dotenv()


@st.cache_resource
def get_retriever():
    """Get the Chroma DB."""

    # embedding = OpenAIEmbeddings(
    #     model="text-embedding-3-large",
    #     dimensions=1024,
    #     skip_empty=True,
    # )
    embedding = OllamaEmbeddings(model="llama3")
    return Chroma(
        collection_name="skcet",
        persist_directory="./chroma",
        embedding_function=embedding,
    ).as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={"score_threshold": 0.75},
    )


def format_docs(docs: list[Document], verbose: bool = False):
    """Format the docs as a strings."""

    res = "\n\n".join(doc.page_content for doc in docs)
    if verbose:
        print(res)
    return res


history = StreamlitChatMessageHistory()
retriever = get_retriever()
# llm = ChatOpenAI(temperature=0, model="gpt-3.5-turbo-0125")
llm = Ollama(model="llama3")
prompt = pull("rlm/rag-prompt")
rag_chain = {  # type: ignore
    "context": retriever | format_docs,
    "question": RunnableWithMessageHistory(
        runnable=prompt | llm,
        get_session_history=lambda: history,
    ),
} | StrOutputParser()


def add_message(
    message: str | Iterator[str],
    *,
    sender: Literal["user", "ai"],
    add_to_history: bool = True,
):
    """Add a message to the chat history."""

    with st.chat_message(sender, avatar=sender):
        st.write_stream(message)
    if add_to_history:
        match sender:
            case "user":
                history.add_user_message(str(message))
            case "ai":
                history.add_ai_message(str(message))


if len(history.messages) == 0:
    add_message("Hi! Ask me a question about SKCET.", sender="ai")

for msg in history.messages:
    add_message(msg.content, sender=msg.type, add_to_history=False)  # type: ignore

if query := st.chat_input("Ask a question about SKCET:"):
    if query:
        add_message(query, sender="user")
        result: Iterator[str] = rag_chain.stream(query)  # type: ignore
        add_message(result, sender="ai")
