import onnx

model = onnx.load("../public/models/phishing_model.onnx")

print("=" * 50)
print("INPUTS")
print("=" * 50)

for inp in model.graph.input:
    print(inp.name)

print("\n" + "=" * 50)
print("OUTPUTS")
print("=" * 50)

for out in model.graph.output:
    print(out.name)