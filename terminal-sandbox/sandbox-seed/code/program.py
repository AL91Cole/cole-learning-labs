import sys

# CODE-501: each kit costs 3 credits. Print the total for the quantity given.
quantity = int(sys.argv[1]) if len(sys.argv) > 1 else 2
total = quantity + 3
print(total)
