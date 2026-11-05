from tools.make_synthetic import generate_synthetic_sample
import inspect

sig = inspect.signature(generate_synthetic_sample)
print('Function signature:')
print(f'generate_synthetic_sample{sig}')
print()
print('Parameters:')
for param_name, param in sig.parameters.items():
    print(f'  {param_name}: {param.default}')
