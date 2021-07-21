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

const Didact = {
  createElement
};
// 使用Didact的createElement替代原生的createElement来创建对象
const element = Didact.createElement(
  'div',
  { id: 'foo' },
  Didact.createElement('a', null, 'bar'),
  Didact.createElement('b')
);

console.log('element', element);
