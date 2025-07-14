# RAG (Retrieval-Augmented Generation) Example
import openai, os, re
import json
import numpy as np
from models import KnownData
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPEN_AI_API_KEY")

# dynamic path but make sure its all in same folder
base_dir = os.path.dirname(os.path.abspath(__file__))
kb_path = os.path.join(base_dir, "kb.txt")
kb_hazard_path = os.path.join(base_dir, "kbhazard.txt")
kb_titleprocess_path = os.path.join(base_dir, "kbtitleprocess.txt")
embedding_cache_path = os.path.join(base_dir, "kb_embeddings.npy")
embedding_hazard_cache_path = os.path.join(base_dir, "kbhazard_embeddings.npy")
embedding_titleprocess_cache_path = os.path.join(base_dir, "kbtitleprocess_embeddings.npy")

# load existing data from file
def load_knowledge_base_from_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        return [phrase.strip() for phrase in content.split("&&") if phrase.strip()]

# this is to save the embeddings to a file so the next time you run the code, it will not have to generate the embeddings again UNLESS the kb.txt file is changed
def save_embeddings(filepath, embeddings):
    np.save(filepath, embeddings)

def load_embeddings(filepath):
    return np.load(filepath, allow_pickle=True)

# to embed user input
def get_embedding(text, model="text-embedding-3-small"):
    response = openai.embeddings.create(
        input=[text],
        model=model
    )
    return np.array(response.data[0].embedding)

# to embed a batch of texts from the knowledge base
def get_embeddings_batched(texts, model="text-embedding-3-small", batch_size=100):
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = openai.embeddings.create(input=batch, model=model)
        batch_embeddings = [np.array(d.embedding) for d in response.data]
        embeddings.extend(batch_embeddings)
    return embeddings

# Compute cosine similarity between two vectors
def cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

# Retrieve top-k most relevant strings 
def retrieve_most_relevant(user_input, knowledge_base, kb_embeddings, top_k=1):
    user_embedding = get_embedding(user_input)
    similarities = [cosine_similarity(user_embedding, emb) for emb in kb_embeddings]
    top_indices = np.argsort(similarities)[::-1][:top_k]
    return [(knowledge_base[i], similarities[i]) for i in top_indices]

# Generate answer using GPT with Prompt engineering and RAG
def generate_answer(user_input, context):
    user_prompt = (
        f"""
            You are a workplace safety risk assessor.

            Based on the new work activity: "{user_input}", and considering similar past tasks:
            {context}

            Please provide for each hazard identified in the work activity:
            Hazard Type:
            Hazard Description:
            Possible Injuries:
            Risk Control Type:
            Risk Controls:
            Severity Score:
            Likelihood Score:
            RPN:

            Take note for hazard types just give the type of hazard, no need explanation or examples.
            Take note for the severity score and likelihood score, its between 1 to 5, where 1 is the lowest and 5 is the highest.
            Take note for the RPN, it is the product of severity score and likelihood score and just give the final number e.g. RPN: 9
            Take note for the risk control type, it can be one type.
            For example:
            Hazard Type: Physical
            Hazard Description: Working at heights without proper fall protection.
            Possible Injuries: Falls leading to fractures or head injuries.
            Risk Control Type: Engineering Controls
            Risk Controls: Use of harnesses, guardrails, and safety nets.
            Severity Score: 4
            Likelihood Score: 4
            RPN: 16
            """
    )

    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a workplace safety and health risk assessor."},
            {"role": "user", "content": user_prompt}
        ]
    )

    return response.choices[0].message.content

def parse_multiple_risk_assessments(response_text):
    # Split based on repeated "Hazard Type:"
    blocks = re.split(r"\bHazard Type:\s*", response_text)[1:]  # skip empty first split

    parsed = []
    for block in blocks:
        hazard_type = block.splitlines()[0].strip()

        hazard_description = re.search(r"Hazard Description:\s*(.*)", block)
        injuries = re.search(r"Possible Injuries:\s*(.*)", block)
        risk_control = re.search(r"Risk Controls:\s*(.*)", block)
        severity = re.search(r"Severity Score:\s*(\d+)", block)
        likelihood = re.search(r"Likelihood Score:\s*(\d+)", block)
        rpn = re.search(r"RPN:\s*(\d+)", block)

        parsed.append({
            "type": [t.strip() for t in hazard_type.split(",")],
            "description": hazard_description.group(1).strip() if hazard_description else None,
            "injuries": [injuries.group(1).strip()] if injuries else [],
            "risk_type": risk_control.group(1).strip() if risk_control else None,
            "existingControls": risk_control.group(1).strip() if risk_control else None,
            "severity": int(severity.group(1)) if severity else None,
            "likelihood": int(likelihood.group(1)) if likelihood else None,
            "rpn": int(rpn.group(1)) if rpn else None,
        })

    return parsed

# Main but to change during integration
# if __name__ == "__main__":
def ai_function(activity):
    # Load KB
    knowledge_base = load_knowledge_base_from_file(kb_path)
    # Precompute or load cached embeddings
    if os.path.exists(embedding_cache_path):
        print("Loading cached embeddings...")
        kb_embeddings = load_embeddings(embedding_cache_path)
    else:
        print("Generating and caching embeddings using batch processing...")
        kb_embeddings = get_embeddings_batched(knowledge_base)
        save_embeddings(embedding_cache_path, kb_embeddings)

    # Retrieve most relevant
    top_matches = retrieve_most_relevant(activity, knowledge_base, kb_embeddings, top_k=1)
    context_text, similarity = top_matches[0]
    print(f"Context text: {context_text}, Similarity: {similarity}")
    if similarity >= 0.35:
        # Query all matching rows by activity_name
        hazard_rows = KnownData.query.filter_by(activity_name=context_text).all()

        # If rows found, convert each row to a dict and store in a list
        hazard_data = [
            {
            "description": row.hazard_des,
            "type": [t.strip() for t in row.hazard_type.split(",")] if row.hazard_type else [],
            "injuries": [row.injury] if row.injury else [],
            "risk_type": row.risk_type,
            "existingControls": row.control,
            "severity": row.severity,
            "likelihood": row.likelihood,
            "rpn": row.rpn
            }
            for row in hazard_rows
        ]
        result = hazard_data
    else:
        # Generate response
        hazard_rows = KnownData.query.filter_by(activity_name=context_text).all()

        # If rows found, convert each row to a dict and store in a list
        hazard_data = [
            {
                "description": row.hazard_des,
                "type": [row.hazard_type] if row.hazard_type else [],
                "injuries": [row.injury] if row.injury else [],
                "risk_type": row.risk_type,
                "existingControls": row.control,
                "severity": row.severity,
                "likelihood": row.likelihood,
                "rpn": row.rpn
            }
            for row in hazard_rows
        ]
        response = generate_answer(activity, hazard_data)
        print("Response from AI:", response)
        result = parse_multiple_risk_assessments(response)

    return result

def reembed_kb():
    # Load KB
    knowledge_base = load_knowledge_base_from_file(kb_path)

    print("Reembedding knowledge base...")
    kb_embeddings = get_embeddings_batched(knowledge_base)
    save_embeddings(embedding_cache_path, kb_embeddings)

    return True

def reembed_kbhazard():
    # Load KB
    knowledge_base = load_knowledge_base_from_file(kb_hazard_path)

    print("Reembedding knowledge base...")
    kb_embeddings = get_embeddings_batched(knowledge_base)
    save_embeddings(embedding_hazard_cache_path, kb_embeddings)

    return True


def load_hazard_kb_and_embeddings():
    # Load KB
    knowledge_base = load_knowledge_base_from_file(kb_hazard_path)

    # Precompute or load cached embeddings
    if os.path.exists(embedding_hazard_cache_path):
        print("Loading cached embeddings...")
        kb_embeddings = load_embeddings(embedding_hazard_cache_path)
    else:
        print("Generating and caching embeddings using batch processing...")
        kb_embeddings = get_embeddings_batched(knowledge_base)
        save_embeddings(embedding_hazard_cache_path, kb_embeddings)

    return knowledge_base, kb_embeddings

def get_hazard_match(activity, knowledge_base, kb_embeddings):
    top_matches = retrieve_most_relevant(activity, knowledge_base, kb_embeddings, top_k=1)
    context_text, similarity = top_matches[0]
    return similarity <= 0.35

def generate_ai_work_activities(title, processName, db_result):
    user_prompt = (
        f"""
            You are a risk assessor.

            Based on this process: "{processName}",

            Please provide 3 new potential work activities in a list format i.e. ["activity1", "activity2", "activity3"].
            """
    )

    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a risk assessor."},
            {"role": "user", "content": user_prompt}
        ]
    )
    content = response.choices[0].message.content
    try:
        activities = json.loads(content)
        return activities
    except json.JSONDecodeError:
        print("Failed to parse AI response as JSON. Response was:", content)
        return []

def get_matched_activities(title, processName):
    '''
    Step 1: Check if the title and processName exists in the knowledge base (minimum similarity of 0.60)
    Step 2: If exists, return the activities associated with the title and processName
    Step 3: If not exists, generate a response using the AI model and return the generted activities
    '''

    knowledge_base = load_knowledge_base_from_file(kb_titleprocess_path)

    # Precompute or load cached embeddings
    if os.path.exists(embedding_titleprocess_cache_path):
        print("Loading cached embeddings...")
        kb_embeddings = load_embeddings(embedding_titleprocess_cache_path)
    else:
        print("Generating and caching embeddings using batch processing...")
        kb_embeddings = get_embeddings_batched(knowledge_base)
        save_embeddings(embedding_titleprocess_cache_path, kb_embeddings)

    # Retrieve most relevant
    titleprocessName = f"{title} {processName}"
    top_matches = retrieve_most_relevant(titleprocessName, knowledge_base, kb_embeddings, top_k=1)
    context_text, similarity = top_matches[0]
    title, processName = context_text.split("%%", 1)
    query_result = KnownData.query.filter(
            KnownData.title.ilike(title),
            KnownData.process.ilike(processName)
            ).all()
    db_result = [row.activity_name for row in query_result]
    db_result = list(dict.fromkeys(db_result))

    if similarity >= 0.4:
        return db_result
    else:
        response = generate_ai_work_activities(title, processName, db_result)
        print("Response from AI:", response)
        return response
    
def get_matched_activities_only_db(title, processName):

    knowledge_base = load_knowledge_base_from_file(kb_titleprocess_path)

    # Precompute or load cached embeddings
    if os.path.exists(embedding_titleprocess_cache_path):
        print("Loading cached embeddings...")
        kb_embeddings = load_embeddings(embedding_titleprocess_cache_path)
    else:
        print("Generating and caching embeddings using batch processing...")
        kb_embeddings = get_embeddings_batched(knowledge_base)
        save_embeddings(embedding_titleprocess_cache_path, kb_embeddings)

    # Retrieve most relevant
    titleprocessName = f"{title} {processName}"
    top_matches = retrieve_most_relevant(titleprocessName, knowledge_base, kb_embeddings, top_k=1)
    context_text, similarity = top_matches[0]
    title, processName = context_text.split("%%", 1)
    query_result = KnownData.query.filter(
            KnownData.title.ilike(title),
            KnownData.process.ilike(processName)
            ).all()
    

    return query_result