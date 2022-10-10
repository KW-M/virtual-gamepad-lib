export function NormalizeClampVector(x: number, y: number, max: number) {
    const length = Math.sqrt(x * x + y * y);
    if (length > max) return { x: x / length, y: y / length };
    else return { x: x / max, y: y / max };
}

export function centerTransformOrigins(querySelector: string) {
    const elements = document.querySelectorAll(querySelector);
    elements.forEach((element) => {
        // const originalTransform = getComputedStyle(element).transform
        // if (!!originalTransform && originalTransform != 'none') console.warn('Transforms on SVG elements are not supported');
        if (element instanceof SVGGraphicsElement) {
            if ((element).getAttribute('transform')) console.warn('Setting Transform origin on an element that already has a transform attribute. This may break the transform!', element);
            const rect = element.getBBox();
            element.style.transformOrigin = `${rect.x + rect.width / 2}px ${rect.y + rect.height / 2}px`;
        } else if (element instanceof HTMLElement) {
            console.warn('Setting Transform origin on an element that is not an SVG element. This may break the transform!', element);
            const rect = element.getBoundingClientRect();
            element.style.transformOrigin = `${rect.width / 2}px ${rect.height / 2}px`;
        }
    });
}

export function centerTransformOriginsDebug(querySelector: string) {
    const elements = document.querySelectorAll(querySelector);
    elements.forEach((element) => {
        if (element instanceof SVGGraphicsElement) {
            const rect = element.getBBox();
            // debug
            console.debug("BBOX_SVG:", rect, element);
            const debugRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            debugRect.setAttribute('fill', "#FF0000A0");
            debugRect.setAttribute('x', rect.x.toString());
            debugRect.setAttribute('y', rect.y.toString());
            debugRect.setAttribute('width', rect.width.toString());
            debugRect.setAttribute('height', rect.height.toString());
            element.insertAdjacentElement('afterend', debugRect);
        } else if (element instanceof HTMLElement) {
            console.warn('Setting Transform origin on an element that is not an SVG element. This may break the transform!', element);
            const rect = element.getBoundingClientRect();
            // debug
            console.debug("BBOX_HTML:", rect, element);
            const debugRect = document.createElement('div');
            debugRect.style.position = "absolute";
            debugRect.style.backgroundColor = "#FF0000A0";
            debugRect.style.left = rect.left.toString();
            debugRect.style.top = rect.top.toString();
            debugRect.style.width = rect.width.toString();
            debugRect.style.height = rect.height.toString();
            element.insertAdjacentElement('afterend', debugRect);
        }
    });
}
