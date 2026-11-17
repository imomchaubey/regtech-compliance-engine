import os
from dotenv import load_dotenv, find_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate

# This will search parent directories for your existing .env file
load_dotenv(find_dotenv())

# Initialize the inference engine with the GPT-OSS 120B model
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model_name="openai/gpt-oss-120b",
    temperature=0
)

def generate_compliance_checklist(title: str, content: str = "Details pending full PDF extraction") -> str:
    """Passes the circular data to the LLM to extract actionable compliance steps."""
    
    prompt = PromptTemplate.from_template(
        "You are a RegTech Compliance Officer for the Indian FinTech sector. "
        "Analyze the following RBI circular update and provide a concise, 3-bullet point summary "
        "highlighting the core mandate, the specific affected entities (e.g., NBFCs, PAs, LSPs), "
        "and any critical deadlines.\n\n"
        "Title: {title}\n"
        "Content snippet: {content}\n\n"
        "Actionable Compliance Summary:"
    )
    
    chain = prompt | llm
    response = chain.invoke({"title": title, "content": content})
    return response.content

if __name__ == "__main__":
    test_title = "RBI mandates Key Fact Statement (KFS) for all Digital Lending Apps"
    print(generate_compliance_checklist(test_title))