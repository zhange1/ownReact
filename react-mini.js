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

function createDom(fiber) {
    const dom = fiber.type === 'TEXT_ELEMENT'
        ? document.createTextNode('')
        : document.createElement(fiber.type);

    const isProperty = key => key !== 'children';
    Object.keys(fiber.props)
        .filter(isProperty)
        .forEach(name => {
            dom[name] = fiber.props[name];
        });

    return dom;
}

function commitRoot() {
  commitWork(wipRoot.child);
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
      return;
  }
  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function render(element, container) {
  // element.props.children.forEach(child =>
  //     render(child, dom)
  // );
  // container.appendChild(dom);
  wipRoot = {
      dom: container,
      props: {
          children: [element]
      }
  };
  nextUnitOfWork = wipRoot;
  console.log('nextUnitOfWork', nextUnitOfWork);
}
let wipRoot = null;
let nextUnitOfWork = null;

function workLoop(deadline) {
    let shouldYield = false;
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        );
        shouldYield = deadline.timeRemaining() < 1;
    }

    if (!nextUnitOfWork && wipRoot) {
        commitRoot();
    }
    requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
  /**
   * dom添加子节点
   * 找下一个节点: 
   *  1. 找这个节点的子节点,  child为空就是到头了
   *  2. 子节点空了, 找兄弟节点,  sibling为空就是到头了
   *  3. 兄弟节点空了, 找叔叔节点  
   * 
   * 问题: 
   * 找兄弟节点和叔叔节点的时候, 怎么判断这个节点已经被找过了? 
   * > 每个fiber的sibling只指向他的下一个fiber, (a和b是兄弟节点, a知道b是自己的兄弟, 但b认为自己没有兄弟 )
   * b找不到兄弟的时候就会找他们的叔叔, a和b的父亲和叔叔也是同样的关系, 这样就不需要判断这个节点是否被找过
   */
  console.log('fiber===', fiber);

  if (!fiber.dom) {
      fiber.dom = createDom(fiber);
  }

  if (fiber.parent) {
      fiber.parent.dom.appendChild(fiber.dom);
  }

  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;
  while (index < elements.length) {
      const element = elements[index];
      const newFiber = {
          type: element.type,
          props: element.props,
          parent: fiber,
          dom: null
      };
      /**
       * 这里给当前的fiber添加child和sibling指向, 并且给当前fiber的兄弟fiber添加sibling指向
       */
      
      if (index === 0) {
          fiber.child = newFiber;
      } else {
          prevSibling.sibling = newFiber;
      }

      prevSibling = newFiber;

      index++;
  }

  // 先找child
  if (fiber.child) {
      return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    // 然后找sibling
      if (nextFiber.sibling) {
          return nextFiber.sibling;
      }
      // 最后找parent的sibling
      nextFiber = nextFiber.parent;
  }
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
  Didact.createElement('b', null, 'ahaaa')
);
const container = document.getElementById('root');
Didact.render(element, container);

console.log('element', element);
