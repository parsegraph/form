import generateID from "parsegraph-generateid";

export default function Form(name) {
  // Save the form name.
  if (name === undefined) {
    name = 'form';
  }
  this._name = name;

  this._listeners = [];
  this._fields = [];

  // Used in creating field IDs for label names.
  this._formID = generateID() + '-' + this.name();

  // Create the form.
  this._formView = document.createElement('form');
  this._formView.id = this._formID;
  this._formView.className = 'parsegraph-form ' + this.name();

  // Ensure the form is not submitted.
  this._formView.addEventListener('submit', (event)=>{
    event.preventDefault();
  });
}

export const parsegraph_createForm = function(name) {
  return new Form(name);
};

Form.prototype.asDOM = function() {
  return this._formView;
};

// Add functions to add HTML elements with text content.
['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'p'].forEach(function(
    elementType,
) {
  Form.prototype[elementType] = function(content) {
    const element = this.appendElement(elementType);
    if (content !== undefined) {
      element.innerHTML = content;
    }
    return element;
  };
});

Form.prototype.appendElement = function(elementType) {
  this._formView.appendChild(document.createElement(elementType));
  return this._formView.lastChild;
};

Form.prototype.addFieldElement = function(
    type,
    name,
    value,
    choices,
) {
  var field = {
    type: type,
    name: name,
    value: value,
    choices: choices,
    isButton: function() {
      return field.type == 'submit' || field.type == 'button';
    },
    hasValue: function() {
      return !field.isButton() && field.type != 'label';
    },
  };
  this._fields.push(field);

  const fieldID = this._formID + '-' + field.name;
  const fieldClass = this.name() + '-' + field.name;
  let fieldElement;

  // Textarea are handled separately.
  if (field.type == 'textarea') {
    fieldElement = this.appendElement('textarea');
    fieldElement.id = fieldID;
    fieldElement.name = field.name;
    fieldElement.className = fieldClass;
    if (field.value !== undefined) {
      fieldElement.innerHTML = field.value;
    }
    fieldElement.addEventListener("change", ()=>{
      this.value(field.name, fieldElement.value, 'set');
    });
    this.addListener(function(name, value) {
      if (name != field.name) {
        return;
      }
      fieldElement.innerHTML = value;
    });
    field.element = fieldElement;
    return field;
  }

  // Label types.
  if (field.type === 'label') {
    fieldElement = this.appendElement('label');
    fieldElement.htmlFor = fieldID;
    fieldElement.innerHTML = field.value;
    fieldElement.className = fieldClass;
    field.element = fieldElement;
    return field;
  }

  // Buttons are handled separately.
  if (field.type == 'submit' || field.type == 'button') {
    fieldElement = this.appendElement('button');
    fieldElement.type = field.type;
    fieldElement.id = fieldID;
    fieldElement.name = field.name;
    fieldElement.className = fieldClass;

    // Set the label and value to the field value.
    fieldElement.innerHTML = field.value;
    if (field.value !== undefined) {
      fieldElement.value = field.value;
    }

    // Listen for button clicks.
    const onChange = function() {
      this.value(field.name, fieldElement.value, 'click');
    };
    if (field.type == 'submit') {
      // Submit buttons automatically handle key presses.
      fieldElement.addEventListener('click', (event)=>{
        this.onChange(event);
      });
    } else {
      parsegraph_addButtonListener(fieldElement, onChange, this);
    }

    // Update the button label when the value changes.
    this.addListener(function(name, value, action) {
      if (name != field.name || action == 'click') {
        return;
      }
      if (fieldElement.value == value) {
        return;
      }

      // Set the field element's value to the new field value.
      fieldElement.innerHTML = value;
      if (value !== undefined) {
        fieldElement.value = value;
      }
    });

    field.element = fieldElement;
    return field;
  }

  if (field.type == 'select') {
    fieldElement = this.appendElement('select');
    field.choices.forEach(function(choice) {
      const childElement = document.createElement('option');
      if (typeof choice == 'object') {
        childElement.value = choice.value;
        childElement.innerHTML = choice.label;
      } else {
        childElement.value = choice;
        childElement.innerHTML = choice;
      }
      if (field.value == choice) {
        childElement.selected = true;
      }
      fieldElement.appendChild(childElement);
    });

    fieldElement.addEventListener('change', ()=>{
      const selected = parsegraph_findSelected(fieldElement);
      if (selected == null) {
        this.value(field.name, null, 'click');
        return;
      }
      this.value(field.name, selected.value, 'click');
    });
  } else if (field.type == 'checkbox') {
    fieldElement = this.appendElement('input');

    // Check the checkbox if the value is truthy.
    if (field.value) {
      fieldElement.checked = field.value;
    }
  } else {
    // Basic inputs.
    fieldElement = this.appendElement('input');

    if (field.value !== undefined) {
      // The form field has a value, so assign it.
      fieldElement.value = field.value;
    }
  }

  // Assign properties for finding the element in the HTML document.
  if (field.type != 'label') {
    fieldElement.id = fieldID;
    fieldElement.type = field.type;
    fieldElement.name = field.name;
  }
  fieldElement.className = fieldClass;

  // Update the form values using field DOM events.
  if (field.type == 'checkbox') {
    // Text-oriented types fire on change events.
    fieldElement.addEventListener('change', ()=>{
      this.value(field.name, fieldElement.checked);
    });
    this.addListener(function(name, value) {
      if (name != field.name) {
        return;
      }
      fieldElement.checked = value;
    }, this);
  } else {
    // Text-oriented types fire on change events.
    fieldElement.addEventListener('change', ()=>{
      this.value(field.name, fieldElement.value);
    });
    this.addListener(function(name, value) {
      if (name != field.name) {
        return;
      }
      fieldElement.value = field.value;
    }, this);
  }

  field.element = fieldElement;
  return field;
};

Form.prototype.clone = function() {
  const copy = new Form(this._name);
  this.eachField(function(field) {
    copy[field.type](field.name, field.value, field.choices);
  }, this);
  return copy;
};

Form.prototype.load = function(src) {
  if (Array.isArray(src)) {
    // Treat src as a JSON array.
    for (let i = 0; i < src.length; ++i) {
      const field = src[i];
      this.value(field.name, field.value);
    }
  } else {
    // Treat src as a JSON object.
    for (const name in src) {
      this.value(name, src[name]);
    }
  }
};

Form.prototype.jsonArray = function() {
  const serialized = [];
  this.eachField(function(field) {
    if (!field.hasValue()) {
      return;
    }
    serialized.push({
      name: field.name,
      value: field.value,
    });
  }, this);
  return serialized;
};

Form.prototype.jsonObject = function() {
  const serialized = {};
  this.eachField(function(field) {
    if (!field.hasValue()) {
      return;
    }
    serialized[field.name] = field.value;
  }, this);
  return serialized;
};

Form.prototype.name = function() {
  return this._name;
};

// Create functions to quickly add fields of these types.
[
  ['label'],
  ['text'],
  ['textarea'],
  ['password'],
  ['checkbox'],
  ['button'],
  ['submit'],
  ['select', 'dropdown', 'comboBox', 'combo'],
].forEach(function(field) {
  const fieldType = field[0];

  /**
   * Adds a field element of this type.
   */
  const addFieldElement = function(name, value, choices) {
    this.addFieldElement(fieldType, name, value, choices);
  };

  /**
   * Adds a label and a field element of this type.
   */
  const addField = function(name, label, value, choices) {
    const labelElement = this.addFieldElement('label', name, label);
    labelElement.element.className += ' ' + fieldType + '-label';
    this.addFieldElement(fieldType, name, value, choices);
  };

  // Add a e.g. checkbox() and checkboxField() methods.
  field.forEach(function(fieldName) {
    Form.prototype[fieldName] = addFieldElement;
    Form.prototype[fieldName + 'Field'] = addField;
  });
});

Form.prototype.value = function(name, value, action) {
  const field = this.getFieldByName(name);
  if (field == undefined) {
    return;
  }
  if (action === undefined) {
    action = 'set';
  }
  if (value !== undefined) {
    if (action == 'set' && field.value === value) {
      return;
    }
    field.value = value;
    this.update(name, value, action);
  }
  return field.value;
};

Form.prototype.clear = function() {
  this.eachField(function(field) {
    if (
      field.type == 'button' ||
      field.type == 'submit' ||
      field.type == 'label'
    ) {
      return;
    }
    this.value(field.name, null, 'set');
  }, this);
};

Form.prototype.getFieldByName = function(name) {
  let labelField = null;
  for (let i = 0; i < this._fields.length; ++i) {
    const field = this._fields[i];
    if (field.name == name) {
      if (field.type != 'label') {
        return field;
      }
      labelField = field;
    }
  }
  return labelField;
};

Form.prototype.elementFor = function(fieldName) {
  const field = this.getFieldByName(fieldName);
  if (field) {
    return field.element;
  }
  return null;
};

Form.prototype.eachField = function(visitor, visitorThisArg) {
  for (let i = 0; i < this._fields.length; ++i) {
    visitor.call(visitorThisArg, this._fields[i]);
  }
};

Form.prototype.addListener = function(listener, thisArg) {
  this._listeners.push([listener, thisArg]);
};

Form.prototype.update = function(name, value, action) {
  this._listeners.forEach(function(listener) {
    listener[0].call(listener[1], name, value, action);
  }, this);
};
