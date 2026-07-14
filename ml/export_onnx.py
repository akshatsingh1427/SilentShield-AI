import joblib
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import StringTensorType

print("Loading model...")

pipeline = joblib.load("phishing_model.pkl")

initial_type = [
    ("text_combined", StringTensorType([None, 1]))
]

onnx_model = convert_sklearn(
    pipeline,
    initial_types=initial_type
)

with open("../public/models/phishing_model.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

print("ONNX model exported successfully!")