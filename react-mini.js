// 创建元素
function createElement(type, props, ...children) {
  return {
      type,
      props: {
          ...props,
          children: children.map(child => typeof child === 'object' ? child : createTextElement(child))
      }
  };
}
// 创建文本元素
function createTextElement(text) {
  return {
      type: 'TEXT_ELEMENT',
      props: {
          nodeValue: text,
          children: []
      }
  };
}

// 新增render方法，用来将生成的元素对象渲染为真正的dom节点
function render(element, container) {
  const dom = element.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(element.type);

  const isProperty = key => key !== 'children';
  Object.keys(element.props)
      .filter(isProperty)
      .forEach(name => {
          dom[name] = element.props[name];
      });
  element.props.children.forEach(child =>
      render(child, dom)
  );
  container.appendChild(dom);
}
let nextUnitOfWork = null;

function workLoop(deadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        );
        shouldYield = deadline.timeRemaining() < 1;
    }
    requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(nextUnitOfWork) {
    // TODO
}

const Didact = {
  createElement,
  render
};

// 使用Didact的createElement替代原生的createElement来创建对象
const element = Didact.createElement(
  'div',
  { id: 'foo' },
  Didact.createElement('a', null, 'bar'),
  Didact.createElement('b')
);
const container = document.getElementById('root');
Didact.render(element, container);

console.log('element', element);
