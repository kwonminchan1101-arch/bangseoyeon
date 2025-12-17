from flask import Flask, render_template, request, jsonify
import re
from collections import Counter

app = Flask(__name__)

# 아주 단순한 "신호" 탐지용 키워드(필요하면 너희 주제에 맞게 수정)
ETHICS_FLAGS = {
    "데이터 누락/선택 보고": ["제외", "삭제", "누락", "대표값만", "이상치 제거"],
    "재현성/검증 부족": ["추가 실험 없음", "반복 실험 없음", "재현", "검증"],
    "과장 표현": ["완벽", "확실", "무조건", "증명됨", "혁신적", "압도적"],
}

BURNOUT_WORDS = ["마감", "압박", "불안", "번아웃", "피곤", "잠", "야근", "무기력", "스트레스"]

def analyze_text(text: str):
    # 기본 전처리
    clean = re.sub(r"\s+", " ", text).strip()

    # 문장 수, 단어 수 같은 기초 통계
    sentences = re.split(r"[.!?。\n]+", clean)
    sentences = [s.strip() for s in sentences if s.strip()]
    words = re.findall(r"[가-힣A-Za-z0-9]+", clean)

    # 윤리 위험 신호(키워드 기반)
    ethics_hits = {}
    for label, keys in ETHICS_FLAGS.items():
        count = 0
        hit_keys = []
        for k in keys:
            c = clean.count(k)
            if c > 0:
                count += c
                hit_keys.append(k)
        ethics_hits[label] = {"count": count, "keywords": hit_keys}

    # 소진(번아웃) 신호
    burnout_count = sum(clean.count(w) for w in BURNOUT_WORDS)
    burnout_keywords = [w for w in BURNOUT_WORDS if w in clean]

    # "검증" 관련 단어가 너무 적으면 경고(예시)
    verification_terms = ["반복", "재현", "검증", "추가 실험", "대조군", "통계", "p값", "유의"]
    verification_count = sum(clean.count(t) for t in verification_terms)

    # Monster Index (0~100) 예시 점수화 (너희 발표용으로 단순하게)
    # - 검증 단어 적을수록 위험↑
    # - 과장/삭제/누락/소진 단어 많을수록 위험↑
    ethics_total = sum(v["count"] for v in ethics_hits.values())
    risk = 0
    risk += min(40, ethics_total * 5)
    risk += min(30, burnout_count * 5)
    if verification_count == 0:
        risk += 30
    elif verification_count < 3:
        risk += 15
    monster_index = min(100, risk)

    # 자주 나온 단어 Top
    freq = Counter([w.lower() for w in words])
    top_words = freq.most_common(10)

    return {
        "stats": {
            "sentences": len(sentences),
            "words": len(words),
            "verification_count": verification_count,
        },
        "ethics_hits": ethics_hits,
        "burnout": {
            "count": burnout_count,
            "keywords": burnout_keywords,
        },
        "monster_index": monster_index,
        "top_words": top_words,
    }

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(force=True)
    text = data.get("text", "")
    result = analyze_text(text)
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
