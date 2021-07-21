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

/**
 *  commitRoot进来的fiber是树的根节点, commitwork递归调用appendChild, 直到整个dom树创建完成, 
 *  浏览器真正执行渲染只有一次, 就是root节点添加fiber跟节点的时候, 递归过程dom树没有交个浏览器, 不会渲染
 */
function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
      return;
  }
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
      domParentFiber = domParentFiber.parent;
  }
  const domParent = fiber.parent.dom;
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
      domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
      updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParentFiber);
  }
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
        domParent.removeChild(fiber.dom);
    } else {
        commitDeletion(fiber.child, domParent);
    }
}

const isEvent = key => key.startsWith('on');
const isProperty = key => key !== 'children' && !isEvent;
const isNew = (prev, next) => key => prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next);
function updateDom(dom, prevProps, nextProps) {

    // 遍历上次渲染的属性, 事件名称有变或事件体有变, 移除事件监听
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(key =>
            !(key in nextProps) || isNew(prevProps, nextProps)(key))
        .forEach(name => {
            const eventType = name.toLowerCase()
                .substring(2);
            dom.removeEventListener(eventType, prevProps[name]);
        });

    // 遍历上次渲染的属性，若旧的属性不在新的props里，置空旧的属性
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => {
            dom[name] = '';
        });

    // 遍历新props, 如果有新的属性, 附上值
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            dom[name] = nextProps[name];
        });

    // 如果有新的事件,监听事件
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => {
            const eventType = name.toLowerCase().substring(2);
            dom.addEventListener(eventType, nextProps[name]);
        });
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
      },
      alternate: currentRoot // alternate指向上次渲染的fiber, 用来做对比
  };
  nextUnitOfWork = wipRoot;
  console.log('nextUnitOfWork', nextUnitOfWork);
}
let wipRoot = null;
let currentRoot = null;
let nextUnitOfWork = null;
let deletions = null;

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

// elements就是wipeFiber的子element, 自己取就好了, 为什么要传进来? 
// 函数组件取children方法不一样, reconcileChildren只管diff, 在这取不合适
function reconcileChildren(wipFiber, elements) {
    const index = 0;

    // 因为这里优先找的是子节点, 先对比子节点
    // 当前wip节点的上一次渲染的fiber的子节点, 如果他不存在child, 而wipFiber有child, 说明此次渲染在当前节点下添加了新节点
    const oldFiber = wipFiber.alternate && wipFiber.alternate.child;
    const prevSibling = null;

    // 这里用或, 先要找当前节点的
    while (index < elements.length || oldFiber !== null) {
        const element = elements[index];
        let newFiber = null;

        //是否存在，且类型一致
        const sameType = oldFiber && element && element.type === oldFiber;
        // 一样就不重新创建了dom, dom就直接指向oldFiber的dom. 标记为update, 后面更新他的props
        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: 'UPDATE'
            };
        }
        // 如果都存在子节点, 但是类型不一样, dom需要重新创建, 标记为placement
        if (element && !sameType) {
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: 'PLACEMENT'
            };
        };
        // 如果当前fiber没有child, 而oldFiber存在, 标记为删除
        if (oldFiber && !sameType) {
            oldFiber.effectTag = 'DELETION';
            deletions.push(oldFiber);
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling;
        }
        // 若是第一个的话，则将根元素的第一个赋值为当前的
        if (index === 0) {
            wipFiber.child = newFiber;
        } else {
            prevSibling.sibling = newFiber;
        }
        prevSibling = newFiber;
    }
}

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

  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
      updateFunctionComponent(fiber);
  } else {
      updateHostComponent(fiber);
  }

  if (!fiber.dom) {
      fiber.dom = createDom(fiber);
  }

  if (fiber.parent) {
      fiber.parent.dom.appendChild(fiber.dom);
  }

  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
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
      //若有子节点返回子节点
      return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    // 若有兄弟节点返回兄弟节点
      if (nextFiber.sibling) {
          return nextFiber.sibling;
      }
      // 既无子节点又无兄弟节点则赋值父节点给while循环继续寻找
      nextFiber = nextFiber.parent;
  }
}

let wipFiber = null;
let hookIndex = null;

function updateFunctionComponent(fiber) {
    wipFiber = fiber;
    hookIndex = 0;
    wipFiber.hooks = [];
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children);
}

// 一个组件有多个useState,
function useState(initial) {
    const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];
    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: []
    };

    const actions = oldHook ? oldHook.queue : [];
    actions.forEach(action => {
        hook.state = action(hook.state);
    });

    const setState = action => {
        hook.queue.push(action);
        wipRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot
        };
        //  nextUnitOfwork有数据了,workloop的执行条件满足了, 会执行performUnitofWork, 页面就会更新了
        nextUnitOfWork = wipRoot;
        deletions = [];
    };

    wipFiber.hooks.push(hook);
    hookIndex++;
    return [hook.state, setState];
}

function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber);
    }
    reconcileChildren(fiber, fiber.props.children);
}

const Didact = {
  createElement,
  render,
  useState
};

// const updateValue = e => {
//     rerender(e.target.value);
// };
/** @jsx Didact.createElement */
// const rerender = value => {
//     const element = (
//         <div>
//             <input onInput={updateValue} value={value} />
//             <h2>Hello {value}</h2>
//         </div>
//     );
//     Didact.render(element, container);
// };

// rerender('please input');

function App(props) {
    return <h1>Hi {props.name}</h1>;
}
const element = <App name='foo' />;
Didact.render(element, container);