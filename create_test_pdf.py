"""
Generates a short test PDF using PyMuPDF (already in requirements).
Run from project root: python create_test_pdf.py
"""

import fitz  # PyMuPDF

CONTENT = """Introduction to Derivatives

What is a Derivative?

A derivative measures how a function changes as its input changes. Formally, the derivative of f(x) is defined as the limit: f'(x) = lim(h→0) [f(x+h) - f(x)] / h. This is called the limit definition of the derivative. The derivative gives the instantaneous rate of change of a function at any point.

Geometrically, the derivative at a point equals the slope of the tangent line to the curve at that point. If the tangent line is rising, the derivative is positive. If it is falling, the derivative is negative. If the function is flat at that point, the derivative is zero.

The Power Rule

The most important differentiation rule is the power rule: d/dx[x^n] = n * x^(n-1). To apply it, multiply the coefficient by the exponent, then reduce the exponent by one.

Examples using the power rule:
- d/dx[x^2] = 2x
- d/dx[x^3] = 3x^2
- d/dx[x^5] = 5x^4
- d/dx[7x^4] = 28x^3

A common misconception is that d/dx[x^2] = x^2 (forgetting to apply the rule). The correct answer is 2x. Another misconception is forgetting to reduce the exponent: d/dx[x^3] is 3x^2, not 3x^3.

Critical Points and the Derivative

A critical point occurs where f'(x) = 0 or where f'(x) is undefined. Critical points are candidates for local maxima, local minima, or saddle points.

To find critical points: compute f'(x), set it equal to zero, and solve for x. For example, if f(x) = x^2 - 4x + 3, then f'(x) = 2x - 4. Setting 2x - 4 = 0 gives x = 2. At x = 2, the function has a minimum because f''(x) = 2 > 0 (positive second derivative means concave up).

The Second Derivative Test

The second derivative f''(x) tells us about the concavity of the function.
- If f''(x) > 0 at a critical point, the point is a local minimum.
- If f''(x) < 0 at a critical point, the point is a local maximum.
- If f''(x) = 0, the test is inconclusive.

The physical meaning of the second derivative is acceleration. If position is s(t), then velocity is s'(t) and acceleration is s''(t).

Edge Cases

What happens when x = 0 in the power rule? d/dx[x^0] = d/dx[1] = 0, since the derivative of any constant is zero. This is consistent with the power rule: 0 * x^(-1) = 0.

What about negative exponents? The power rule still applies: d/dx[x^(-2)] = -2x^(-3) = -2/x^3. The rule works for all real exponents, not just positive integers.
"""


def create_pdf(output_path: str):
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4

    margin_x = 60
    margin_top = 60
    line_height = 18
    font_size_body = 11
    font_size_title = 16

    y = margin_top
    max_width = 595 - 2 * margin_x

    for line in CONTENT.strip().split('\n'):
        line = line.strip()

        # Blank line = spacing
        if not line:
            y += line_height * 0.5
            continue

        # Detect title lines (all caps first letter, short, no period)
        is_title = (
            len(line) < 60 and
            line[0].isupper() and
            not line.endswith('.') and
            not line.startswith('-') and
            not line.startswith('f(') and
            not line.startswith('d/')
        )

        if is_title and y < margin_top + 5:  # First line = main title
            font_size = font_size_title + 4
        elif is_title:
            font_size = font_size_title
            y += 6  # extra space before section headings
        else:
            font_size = font_size_body

        # Wrap long lines manually
        words = line.split(' ')
        current_line = ''
        for word in words:
            test_line = (current_line + ' ' + word).strip()
            # Estimate width (rough: ~6px per char at size 11)
            estimated_width = len(test_line) * font_size * 0.52
            if estimated_width > max_width and current_line:
                page.insert_text(
                    (margin_x, y),
                    current_line,
                    fontsize=font_size,
                    color=(0, 0, 0) if not is_title else (0.12, 0.12, 0.55),
                )
                y += line_height
                current_line = word
                # New page if needed
                if y > 800:
                    page = doc.new_page(width=595, height=842)
                    y = margin_top
            else:
                current_line = test_line

        if current_line:
            page.insert_text(
                (margin_x, y),
                current_line,
                fontsize=font_size,
                color=(0, 0, 0) if not is_title else (0.12, 0.12, 0.55),
            )
            y += line_height
            if y > 800:
                page = doc.new_page(width=595, height=842)
                y = margin_top

    page_count = len(doc)
    doc.save(output_path)
    doc.close()
    print(f"PDF saved: {output_path} ({page_count} page(s))")


if __name__ == '__main__':
    create_pdf('test_calculus.pdf')
